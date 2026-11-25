import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  const conn = await db('meta_connections').where({ id: '1a8e22dc-5f03-4e0b-8b4d-a7a8804d7adf' }).first();
  console.log('Conn status:', conn?.status, 'expires_at:', conn?.credential_expires_at);
  if (conn?.encrypted_user_access_token) {
    try {
      const uToken = metaTokenManager.decryptToken(conn.encrypted_user_access_token);
      const dbg = await metaTokenManager.debugToken(uToken);
      console.log('User token debug: isValid=', dbg.isValid, 'expiresAt=', dbg.expiresAt, 'scopes=', dbg.scopes);
    } catch (e) {
      console.log('User token debug error:', e.message);
    }
  }
  if (conn?.encrypted_page_access_token) {
    try {
      const pToken = metaTokenManager.decryptToken(conn.encrypted_page_access_token);
      const dbg = await metaTokenManager.debugToken(pToken);
      console.log('Page token debug: isValid=', dbg.isValid, 'expiresAt=', dbg.expiresAt, 'scopes=', dbg.scopes);
    } catch (e) {
      console.log('Page token debug error:', e.message);
    }
  }

  const social = await db('social_accounts').where({ id: 'fc6c02ee-489a-4b30-9cc7-2e4500bd7e29' }).first();
  if (social?.access_token_encrypted) {
    try {
      const sToken = metaTokenManager.decryptToken(social.access_token_encrypted);
      const dbg = await metaTokenManager.debugToken(sToken);
      console.log('Social account token debug: isValid=', dbg.isValid, 'expiresAt=', dbg.expiresAt, 'scopes=', dbg.scopes);
    } catch (e) {
      console.log('Social account token debug error:', e.message);
    }
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
