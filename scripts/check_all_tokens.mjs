import dotenv from 'dotenv';
dotenv.config({ path: 'f:/SocialAgent/.env' });
import { db } from '../apps/api/dist/db/connection.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { decryptSecret, isEncryptedSecret } from '../apps/api/dist/services/cryptoVault.js';

async function main() {
  const connections = await db('meta_connections').select('id', 'brand_id', 'status', 'credential_expires_at', 'encrypted_user_access_token', 'encrypted_page_access_token');
  console.log(`Checking ${connections.length} meta_connections records:`);
  for (const c of connections) {
    for (const key of ['encrypted_user_access_token', 'encrypted_page_access_token']) {
      let token = c[key];
      if (token && isEncryptedSecret(token)) {
        try { token = decryptSecret(token); } catch {}
      }
      if (token) {
        try {
          const dbg = await metaTokenManager.debugToken(token);
          console.log(`Connection ${c.id} [${key}]: status=${c.status}, isValid=${dbg.isValid}, expiresAt=${dbg.expiresAt}`);
        } catch (e) {
          console.log(`Connection ${c.id} [${key}]: error=${e.message}`);
        }
      }
    }
  }

  const fbPages = await db('meta_facebook_pages').select('id', 'page_id', 'name', 'encrypted_access_token');
  console.log(`Checking ${fbPages.length} meta_facebook_pages records:`);
  for (const p of fbPages) {
    let token = p.encrypted_access_token;
    if (token && isEncryptedSecret(token)) {
      try { token = decryptSecret(token); } catch {}
    }
    if (token) {
      try {
        const dbg = await metaTokenManager.debugToken(token);
        console.log(`Page ${p.page_id} (${p.name}): isValid=${dbg.isValid}, expiresAt=${dbg.expiresAt}`);
      } catch (e) {
        console.log(`Page ${p.page_id} (${p.name}): error=${e.message}`);
      }
    }
  }

  const socialAccounts = await db('social_accounts').where({ platform: 'facebook' });
  console.log(`Checking ${socialAccounts.length} Facebook social_accounts records:`);
  for (const sa of socialAccounts) {
    let token = sa.access_token_encrypted;
    if (token && isEncryptedSecret(token)) {
      try { token = decryptSecret(token); } catch {}
    }
    if (token) {
      try {
        const dbg = await metaTokenManager.debugToken(token);
        console.log(`Account ${sa.id} (${sa.account_name}): is_active=${sa.is_active}, isValid=${dbg.isValid}, expiresAt=${dbg.expiresAt}`);
      } catch (e) {
        console.log(`Account ${sa.id} (${sa.account_name}): error=${e.message}`);
      }
    }
  }

  process.exit(0);
}
main().catch(console.error);
