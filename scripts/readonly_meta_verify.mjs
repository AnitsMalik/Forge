import dotenv from 'dotenv';
dotenv.config({ path: 'f:/SocialAgent/.env' });
import { db } from '../apps/api/dist/db/connection.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { decryptSecret, isEncryptedSecret } from '../apps/api/dist/services/cryptoVault.js';

async function main() {
  const TARGET_PAGE_ID = '1405588742634526';
  const out = {
    sourcesChecked: [],
    validTokenSource: null,
    tokenValid: false,
    tokenExpiresAt: null,
    scopes: [],
    pages_show_list: false,
    pages_read_engagement: false,
    pages_manage_posts: false,
    instagram_basic: false,
    instagram_content_publish: false,
    pageFound: false,
    pageName: null,
    instagramBusinessAccountId: null,
    instagramUsername: null,
    instagramEligible: false,
    mockFallbackDisabled: true,
    errors: [],
  };

  const candidateTokens = [];

  // Check .env
  if (process.env.META_DEV_ACCESS_TOKEN) {
    candidateTokens.push({ source: '.env:META_DEV_ACCESS_TOKEN', token: process.env.META_DEV_ACCESS_TOKEN });
  }

  // Check meta_connections
  const connections = await db('meta_connections').orderBy('updated_at', 'desc').select('*');
  for (const c of connections) {
    for (const key of ['encrypted_user_access_token', 'encrypted_page_access_token']) {
      let t = c[key];
      if (t) {
        if (isEncryptedSecret(t)) {
          try { t = decryptSecret(t); } catch {}
        }
        candidateTokens.push({ source: `meta_connections:${c.id}:${key}`, token: t, connection: c });
      }
    }
  }

  // Check meta_facebook_pages
  const pages = await db('meta_facebook_pages').where({ page_id: TARGET_PAGE_ID }).select('*');
  for (const p of pages) {
    let t = p.encrypted_access_token;
    if (t) {
      if (isEncryptedSecret(t)) {
        try { t = decryptSecret(t); } catch {}
      }
      candidateTokens.push({ source: `meta_facebook_pages:${p.id}`, token: t, pageRecord: p });
    }
  }

  // Check social_accounts
  const saList = await db('social_accounts').where({ account_id: TARGET_PAGE_ID }).select('*');
  for (const sa of saList) {
    let t = sa.access_token_encrypted;
    if (t) {
      if (isEncryptedSecret(t)) {
        try { t = decryptSecret(t); } catch {}
      }
      candidateTokens.push({ source: `social_accounts:${sa.id}`, token: t, saRecord: sa });
    }
  }

  out.sourcesChecked = candidateTokens.map((c) => c.source);

  // Find the valid token
  let chosenToken = null;
  let chosenDebug = null;

  for (const c of candidateTokens) {
    try {
      const dbg = await metaTokenManager.debugToken(c.token);
      if (dbg.isValid) {
        chosenToken = c.token;
        chosenDebug = dbg;
        out.validTokenSource = c.source;
        out.tokenValid = true;
        out.tokenExpiresAt = dbg.expiresAt;
        out.scopes = dbg.scopes || [];
        break;
      }
    } catch (e) {
      out.errors.push(`${c.source}: ${e.message}`);
    }
  }

  if (chosenToken && chosenDebug) {
    out.pages_show_list = out.scopes.includes('pages_show_list');
    out.pages_read_engagement = out.scopes.includes('pages_read_engagement');
    out.pages_manage_posts = out.scopes.includes('pages_manage_posts');
    out.instagram_basic = out.scopes.includes('instagram_basic');
    out.instagram_content_publish = out.scopes.includes('instagram_content_publish');

    // 1. Discover Pages
    try {
      const accountsRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,tasks&access_token=${chosenToken}`);
      const accountsJson = await accountsRes.json();
      if (accountsJson.error) {
        out.errors.push(`me/accounts error: ${accountsJson.error.message}`);
      } else {
        const found = (accountsJson.data || []).find((p) => p.id === TARGET_PAGE_ID);
        if (found) {
          out.pageFound = true;
          out.pageName = found.name;
          const pageToken = found.access_token || chosenToken;

          // 2. Query Page for Instagram Business Account
          const pageRes = await fetch(`https://graph.facebook.com/v20.0/${TARGET_PAGE_ID}?fields=id,name,instagram_business_account{id,username,name}&access_token=${pageToken}`);
          const pageJson = await pageRes.json();
          if (pageJson.error) {
            out.errors.push(`Page fields error: ${pageJson.error.message}`);
          } else if (pageJson.instagram_business_account?.id) {
            out.instagramBusinessAccountId = pageJson.instagram_business_account.id;
            out.instagramUsername = pageJson.instagram_business_account.username || null;

            // 3. Verify Instagram Account can be queried
            const igRes = await fetch(`https://graph.facebook.com/v20.0/${pageJson.instagram_business_account.id}?fields=id,username,name&access_token=${pageToken}`);
            const igJson = await igRes.json();
            if (igJson.id && !igJson.error) {
              out.instagramEligible = true;
            } else {
              out.errors.push(`Instagram endpoint error: ${igJson.error?.message || 'unknown'}`);
            }
          }
        }
      }
    } catch (fetchErr) {
      out.errors.push(`Network fetch error: ${fetchErr.message}`);
    }
  }

  console.log('READONLY_VERIFICATION_RESULT:', JSON.stringify(out, null, 2));
  process.exit(0);
}

main().catch((e) => {
  console.error('Crash in verify:', e);
  process.exit(1);
});
