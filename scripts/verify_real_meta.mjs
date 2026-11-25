import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: 'f:/SocialAgent/.env' });
import { db } from '../apps/api/dist/db/connection.js';
import { decryptSecret, isEncryptedSecret } from '../apps/api/dist/services/cryptoVault.js';

async function verify() {
  const TARGET_PAGE_ID = '1405588742634526';
  const appId = process.env.META_APP_ID || '1785874552561096';
  const appSecret = process.env.META_APP_SECRET;
  const appToken = `${appId}|${appSecret}`;

  console.log('--- Verifying Meta Production Connection ---');
  
  // 1. Gather all candidate real tokens (not starting with mock_)
  const candidates = [];
  
  const envToken = process.env.META_DEV_ACCESS_TOKEN?.trim();
  if (envToken && !envToken.startsWith('mock_')) {
    candidates.push({ label: 'ENV:META_DEV_ACCESS_TOKEN', token: envToken });
  }

  const connections = await db('meta_connections').orderBy('updated_at', 'desc');
  for (const c of connections) {
    for (const key of ['encrypted_user_access_token', 'encrypted_page_access_token']) {
      let t = c[key];
      if (t && isEncryptedSecret(t)) {
        try { t = decryptSecret(t); } catch {}
      }
      if (t && !t.startsWith('mock_')) {
        candidates.push({ label: `meta_connections:${c.id}:${key}`, token: t });
      }
    }
  }

  const pages = await db('meta_facebook_pages').where({ page_id: TARGET_PAGE_ID });
  for (const p of pages) {
    let t = p.encrypted_access_token;
    if (t && isEncryptedSecret(t)) {
      try { t = decryptSecret(t); } catch {}
    }
    if (t && !t.startsWith('mock_')) {
      candidates.push({ label: `meta_facebook_pages:${p.id}`, token: t });
    }
  }

  const accounts = await db('social_accounts').where({ account_id: TARGET_PAGE_ID });
  for (const a of accounts) {
    let t = a.access_token_encrypted;
    if (t && isEncryptedSecret(t)) {
      try { t = decryptSecret(t); } catch {}
    }
    if (t && !t.startsWith('mock_')) {
      candidates.push({ label: `social_accounts:${a.id}`, token: t });
    }
  }

  console.log(`Found ${candidates.length} non-mock candidate tokens.`);

  let workingToken = null;
  let workingDebug = null;
  let workingLabel = null;

  for (const item of candidates) {
    try {
      const debugRes = await fetch(`https://graph.facebook.com/v20.0/debug_token?input_token=${item.token}&access_token=${appToken}`);
      const debugJson = await debugRes.json();
      const info = debugJson?.data;
      if (info) {
        console.log(`[${item.label}]: isValid=${info.is_valid}, expiresAt=${info.expires_at ? new Date(info.expires_at * 1000).toISOString() : 'never'}, scopes=${info.scopes?.join(',')}`);
        if (info.is_valid) {
          workingToken = item.token;
          workingDebug = info;
          workingLabel = item.label;
          break;
        }
      } else {
        console.log(`[${item.label}]: error=${debugJson?.error?.message}`);
      }
    } catch (e) {
      console.log(`[${item.label}]: fetch error=${e.message}`);
    }
  }

  if (!workingToken) {
    console.log('NO VALID REAL META TOKEN FOUND.');
    process.exit(0);
  }

  console.log(`\nValid token found in ${workingLabel}. Inspecting permissions & Page ${TARGET_PAGE_ID}...`);

  // Verify Page Discovery
  const accountsRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,tasks&access_token=${workingToken}`);
  const accountsJson = await accountsRes.json();
  const pageList = accountsJson.data || [];
  console.log(`Discovered ${pageList.length} pages in me/accounts.`);

  const targetPage = pageList.find((p) => p.id === TARGET_PAGE_ID);
  if (!targetPage) {
    console.log(`PAGE ${TARGET_PAGE_ID} NOT FOUND in me/accounts.`);
    // Try directly querying page with token
    const directRes = await fetch(`https://graph.facebook.com/v20.0/${TARGET_PAGE_ID}?fields=id,name,instagram_business_account{id,username,name}&access_token=${workingToken}`);
    const directJson = await directRes.json();
    console.log('Direct query on Page ID:', directJson);
  } else {
    console.log(`PAGE FOUND: ${targetPage.name} (${targetPage.id})`);
    const pageToken = targetPage.access_token || workingToken;

    // Query Instagram Business Account
    const igRes = await fetch(`https://graph.facebook.com/v20.0/${TARGET_PAGE_ID}?fields=id,name,instagram_business_account{id,username,name}&access_token=${pageToken}`);
    const igJson = await igRes.json();
    console.log('Instagram field query:', JSON.stringify(igJson, null, 2));
  }

  process.exit(0);
}

verify().catch((e) => {
  console.error(e);
  process.exit(1);
});
