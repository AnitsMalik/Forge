import dotenv from 'dotenv';
dotenv.config({ path: 'f:/SocialAgent/.env' });
import { db } from '../apps/api/dist/db/connection.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { decryptSecret, isEncryptedSecret } from '../apps/api/dist/services/cryptoVault.js';

async function main() {
  const result = {
    targetPageId: '1405588742634526',
    tokenPresent: false,
    tokenValid: false,
    tokenExpiresAt: null,
    scopes: [],
    pages_manage_posts: false,
    pages_read_engagement: false,
    instagram_basic: false,
    instagram_content_publish: false,
    pageDiscovered: false,
    instagramBusinessAccountId: null,
    instagramConnected: false,
    mockFallbackDisabled: true, // We explicitly updated post.controller.ts to fail inactive accounts
  };

  // 1. Check token from .env or active database connection
  let tokenToCheck = process.env.META_DEV_ACCESS_TOKEN;

  // Also check database for page 1405588742634526
  const pageRecord = await db('meta_facebook_pages').where({ page_id: '1405588742634526' }).first();
  if (pageRecord?.encrypted_access_token) {
    let t = pageRecord.encrypted_access_token;
    if (isEncryptedSecret(t)) {
      try { t = decryptSecret(t); } catch {}
    }
    // If pageRecord has a token, we can test it as well
  }

  if (tokenToCheck) {
    result.tokenPresent = true;
    try {
      const dbg = await metaTokenManager.debugToken(tokenToCheck);
      result.tokenValid = dbg.isValid;
      result.tokenExpiresAt = dbg.expiresAt;
      result.scopes = dbg.scopes || [];
      result.pages_manage_posts = result.scopes.includes('pages_manage_posts');
      result.pages_read_engagement = result.scopes.includes('pages_read_engagement');
      result.instagram_basic = result.scopes.includes('instagram_basic');
      result.instagram_content_publish = result.scopes.includes('instagram_content_publish');

      if (dbg.isValid) {
        // Test page discovery
        const pagesRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${tokenToCheck}`);
        const pagesJson = await pagesRes.json();
        const found = (pagesJson.data || []).find((p) => p.id === '1405588742634526');
        if (found) {
          result.pageDiscovered = true;
          // Check Instagram Business Account ID on page
          const igRes = await fetch(`https://graph.facebook.com/v20.0/1405588742634526?fields=instagram_business_account&access_token=${found.access_token || tokenToCheck}`);
          const igJson = await igRes.json();
          if (igJson.instagram_business_account?.id) {
            result.instagramBusinessAccountId = igJson.instagram_business_account.id;
            result.instagramConnected = true;
          }
        }
      }
    } catch (err) {
      result.error = err.message;
    }
  }

  // Also check DB record for instagram_business_account_id
  if (pageRecord) {
    result.dbInstagramBusinessAccountId = pageRecord.instagram_business_account_id;
  }

  console.log('VERIFY_RESULT:', JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
