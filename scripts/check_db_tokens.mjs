import dotenv from 'dotenv';
dotenv.config({ path: 'f:/SocialAgent/.env' });
import { db } from '../apps/api/dist/db/connection.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { decryptSecret, isEncryptedSecret } from '../apps/api/dist/services/cryptoVault.js';

async function main() {
  const connections = await db('meta_connections').select('*');
  console.log(`Found ${connections.length} meta_connections records:`);
  for (const c of connections) {
    let token = c.user_access_token_encrypted;
    if (token && isEncryptedSecret(token)) {
      try { token = decryptSecret(token); } catch {}
    }
    if (token) {
      try {
        const dbg = await metaTokenManager.debugToken(token);
        console.log(`Connection ${c.id}: status=${c.status}, isValid=${dbg.isValid}, expiresAt=${dbg.expiresAt}`);
      } catch (e) {
        console.log(`Connection ${c.id}: error=${e.message}`);
      }
    } else {
      console.log(`Connection ${c.id}: no token found`);
    }
  }

  const fbPages = await db('meta_facebook_pages').select('*');
  console.log(`Found ${fbPages.length} meta_facebook_pages records:`);
  for (const p of fbPages) {
    let token = p.page_access_token_encrypted;
    if (token && isEncryptedSecret(token)) {
      try { token = decryptSecret(token); } catch {}
    }
    if (token) {
      try {
        const dbg = await metaTokenManager.debugToken(token);
        console.log(`Page ${p.page_id} (${p.page_name}): is_active=${p.is_active}, isValid=${dbg.isValid}, expiresAt=${dbg.expiresAt}`);
      } catch (e) {
        console.log(`Page ${p.page_id} (${p.page_name}): error=${e.message}`);
      }
    } else {
      console.log(`Page ${p.page_id} (${p.page_name}): no token found`);
    }
  }

  process.exit(0);
}
main().catch(console.error);
