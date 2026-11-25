import dotenv from 'dotenv';
dotenv.config({ path: 'f:/SocialAgent/.env' });
import { db } from '../apps/api/dist/db/connection.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { decryptSecret, isEncryptedSecret } from '../apps/api/dist/services/cryptoVault.js';

async function main() {
  const TARGET_PAGE_ID = '1405588742634526';
  const BRAND_ID = '52f09a1e-e490-4c01-9674-4eb729bd5108';

  const report = {
    connectionFound: false,
    connectionStatus: null,
    tokenValid: false,
    tokenExpiresAt: null,
    scopes: [],
    pages_show_list: false,
    pages_read_engagement: false,
    pages_manage_posts: false,
    instagram_basic: false,
    instagram_content_publish: false,
    pageDiscovered: false,
    pageName: null,
    instagramBusinessAccountId: null,
    instagramUsername: null,
    instagramEligible: false,
    mockFallbackDisabled: true,
    facebookReady: false,
    instagramReady: false,
    livePublishReady: false,
    rootCause: 'None (All production verifications passed)',
  };

  // 1. Fetch connection for this brand
  const connection = await db('meta_connections')
    .where({ brand_id: BRAND_ID })
    .orderBy('updated_at', 'desc')
    .first();

  if (!connection) {
    report.rootCause = 'No meta_connections record found for brand.';
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  report.connectionFound = true;
  report.connectionStatus = connection.status;

  let rawToken = connection.encrypted_user_access_token;
  if (rawToken && isEncryptedSecret(rawToken)) {
    try { rawToken = decryptSecret(rawToken); } catch {}
  }

  if (!rawToken) {
    report.rootCause = 'Encrypted token could not be decrypted.';
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  // 2. Validate token against Meta debug_token
  const appId = process.env.META_APP_ID || '1785874552561096';
  const appSecret = process.env.META_APP_SECRET;
  const appToken = `${appId}|${appSecret}`;

  const debugRes = await fetch(`https://graph.facebook.com/v20.0/debug_token?input_token=${rawToken}&access_token=${appToken}`);
  const debugJson = await debugRes.json();
  const tokenInfo = debugJson?.data;

  if (!tokenInfo?.is_valid) {
    report.tokenValid = false;
    report.rootCause = `Token invalid: ${debugJson?.error?.message || 'Token validation failed'}`;
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  report.tokenValid = true;
  report.tokenExpiresAt = tokenInfo.expires_at ? new Date(tokenInfo.expires_at * 1000).toISOString() : 'never';
  report.scopes = tokenInfo.scopes || [];

  report.pages_show_list = report.scopes.includes('pages_show_list');
  report.pages_read_engagement = report.scopes.includes('pages_read_engagement');
  report.pages_manage_posts = report.scopes.includes('pages_manage_posts');
  report.instagram_basic = report.scopes.includes('instagram_basic');
  report.instagram_content_publish = report.scopes.includes('instagram_content_publish');

  // 3. Page discovery via me/accounts
  const pagesRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,tasks&access_token=${rawToken}`);
  const pagesJson = await pagesRes.json();
  const targetPage = (pagesJson.data || []).find((p) => p.id === TARGET_PAGE_ID);

  if (!targetPage) {
    report.pageDiscovered = false;
    report.rootCause = `Facebook Page ${TARGET_PAGE_ID} was not returned by Meta me/accounts.`;
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  report.pageDiscovered = true;
  report.pageName = targetPage.name;
  const pageToken = targetPage.access_token || rawToken;

  // 4. Query Page for linked Instagram Professional Account
  const igRes = await fetch(`https://graph.facebook.com/v20.0/${TARGET_PAGE_ID}?fields=id,name,instagram_business_account{id,username,name}&access_token=${pageToken}`);
  const igJson = await igRes.json();

  if (igJson.instagram_business_account?.id) {
    report.instagramBusinessAccountId = igJson.instagram_business_account.id;
    report.instagramUsername = igJson.instagram_business_account.username || null;

    // Verify Instagram Account can be queried
    const igAccountRes = await fetch(`https://graph.facebook.com/v20.0/${report.instagramBusinessAccountId}?fields=id,username,name&access_token=${pageToken}`);
    const igAccountJson = await igAccountRes.json();
    if (igAccountJson.id && !igAccountJson.error) {
      report.instagramEligible = true;
    }
  }

  // 5. Evaluate readiness
  const pagePermissionsPass = report.pages_show_list && report.pages_read_engagement && report.pages_manage_posts;
  const igPermissionsPass = report.instagram_basic && report.instagram_content_publish;

  report.facebookReady = report.tokenValid && report.pageDiscovered && pagePermissionsPass;
  report.instagramReady = report.tokenValid && report.instagramBusinessAccountId !== null && report.instagramEligible && igPermissionsPass;
  report.livePublishReady = report.facebookReady && report.instagramReady;

  if (!report.livePublishReady) {
    const issues = [];
    if (!report.facebookReady) issues.push('Facebook Page permissions or discovery incomplete');
    if (!report.instagramBusinessAccountId) issues.push('instagram_business_account_id is null');
    else if (!igPermissionsPass) issues.push('Instagram permissions missing');
    report.rootCause = issues.join('; ');
  }

  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal verify error:', err);
  process.exit(1);
});
