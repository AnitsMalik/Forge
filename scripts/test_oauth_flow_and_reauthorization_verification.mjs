import assert from 'node:assert';
import { db } from '../apps/api/dist/db/connection.js';
import { MetaClient } from '../apps/api/dist/services/meta/metaClient.js';
import { metaOAuthService } from '../apps/api/dist/services/meta/metaOAuth.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { PlanGuardService } from '../apps/api/dist/services/billing/planGuard.service.js';
import { EntitlementService } from '../apps/api/dist/services/entitlement.service.js';
import { normalizeMetaError } from '../apps/api/dist/services/meta/errors.js';
import { encryptSecret, decryptSecret, isEncryptedSecret } from '../apps/api/dist/services/cryptoVault.js';

console.log('========================================================================');
console.log('  OAUTH FLOW, PLAN EXPIRY VS TOKEN EXPIRY, & REAUTH VERIFICATION        ');
console.log('========================================================================\n');

let pass = 0;
let fail = 0;

async function check(desc, fn) {
  try {
    process.stdout.write(`• ${desc} ... `);
    await fn();
    console.log('✅ PASS');
    pass++;
  } catch (err) {
    console.log(`❌ FAIL: ${err.message}`);
    fail++;
  }
}

const BRAND_ID = '52f09a1e-e490-4c01-9674-4eb729bd5108';
const TENANT_ID = '1d9190fa-bd85-4304-8e73-8ef3ca62c342';
const USER_ID = 'a58ee49d-5d31-4135-817a-132e7cea5fe9';

async function main() {
  // 1. Meta OAuth Authorization URL Generation
  await check('Meta OAuth Authorization URL Generation', async () => {
    const authUrl = metaOAuthService.getAuthorizationUrl(TENANT_ID, BRAND_ID, USER_ID);
    assert.ok(authUrl, 'Authorization URL must not be empty');
    assert.ok(authUrl.startsWith('https://www.facebook.com/v20.0/dialog/oauth'), 'URL must target Facebook OAuth dialog');
    assert.ok(authUrl.includes('client_id=1785874552561096'), 'Must include correct App ID');
    assert.ok(authUrl.includes('pages_manage_posts'), 'Must include pages_manage_posts scope');
    assert.ok(authUrl.includes('instagram_content_publish'), 'Must include instagram_content_publish scope');
    assert.ok(authUrl.includes('state='), 'Must include encrypted state parameter');
  });

  // 2. Plan-Based Expiry vs Meta Access-Token Expiry Distinction
  await check('Plan-Based Expiry vs Meta Token Expiry Separation', async () => {
    // 2a. Plan Guard check (billing layer)
    const planGuard = new PlanGuardService();
    const planResult = await planGuard.check(TENANT_ID, 'social_accounts');
    assert.ok(typeof planResult.allowed === 'boolean', 'Plan check must return boolean allowed');
    assert.ok(planResult.planId, 'Plan check must return commercial tier planId');
    assert.strictEqual(planResult.upgradeRequired, false, 'Tenant plan is in active state');

    // 2b. Meta Token Expiry check (cryptographic provider layer)
    const metaTokenError = {
      status: 401,
      code: 190,
      error_subcode: 463,
      message: 'Session has expired'
    };
    const normalizedToken = normalizeMetaError(metaTokenError);
    assert.strictEqual(normalizedToken.code, 'META_TOKEN_EXPIRED');
    assert.strictEqual(normalizedToken.httpStatus, 401);

    // Assert the two failure domains are completely distinct
    assert.notStrictEqual(normalizedToken.code, 'PLAN_LIMIT_EXCEEDED', 'Token error must not be confused with plan limit');
    assert.notStrictEqual(normalizedToken.httpStatus, 403, 'Token error is 401 Unauthorized, not 403 Forbidden');
  });

  // 3. Simulated Token Exchange & Safe Reauthorization
  await check('Safe Token Exchange & Reauthorization Handling', async () => {
    // Register mock handlers for code exchange and page discovery
    MetaClient.registerMock('oauth/access_token', () => ({
      access_token: 'mock_reauthorized_user_token_' + Date.now(),
      expires_in: 5184000, // 60 days
      token_type: 'bearer'
    }));

    MetaClient.registerMock('debug_token', () => ({
      data: {
        app_id: '1785874552561096',
        type: 'USER',
        application: 'HOASP INTERNATIONAL',
        is_valid: true,
        expires_at: Math.floor(Date.now() / 1000) + 5184000,
        scopes: ['pages_manage_posts', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish']
      }
    }));

    try {
      const exchanged = await metaTokenManager.exchangeCodeForToken('mock_code_test_reauth');
      assert.ok(exchanged.accessToken, 'Token exchange must return access token');
      assert.strictEqual(exchanged.expiresIn, 3600);

      // Verify token encryption
      const encrypted = metaTokenManager.encryptToken(exchanged.accessToken);
      assert.ok(isEncryptedSecret(encrypted), 'Exchanged token must be encrypted before persistence');
      assert.strictEqual(metaTokenManager.decryptToken(encrypted), exchanged.accessToken);
    } finally {
      MetaClient.clearMocks();
    }
  });

  // 4. Permanent Production Meta Lock Invariant
  await check('Permanent Production Meta Publication Lock Invariant', async () => {
    const variant = await db('post_variants')
      .where({ remote_post_id: '1405588742634526_122100337179498315' })
      .first();
    assert.ok(variant, 'Production Meta post variant must exist');
    assert.strictEqual(variant.status, 'published', 'Production variant must be strictly locked in published');

    const job = await db('publishing_jobs')
      .where({ id: '256cf21a-26cd-4032-a7b8-17261d8a81b1' })
      .first();
    assert.ok(job, 'Production publishing job must exist');
    assert.strictEqual(job.status, 'published', 'Production publishing job must be strictly locked in published');
  });

  console.log('\n========================================================================');
  console.log(`VERIFICATION RESULT: ${pass} PASS / ${fail} FAIL`);
  console.log('========================================================================');

  await db.destroy();
  if (fail > 0) process.exit(1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
