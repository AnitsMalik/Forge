import { db } from '../apps/api/dist/db/connection.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { decryptSecret } from '../apps/api/dist/services/cryptoVault.js';

async function main() {
  const c = await db('meta_connections').where({ id: '1a8e22dc-5f03-4e0b-8b4d-a7a8804d7adf' }).first();
  const token = decryptSecret(c.encrypted_page_access_token || c.encrypted_user_access_token);
  console.log('Conn Page Token length:', token.length, 'prefix:', token.slice(0, 15));
  try {
    const res = await metaTokenManager.debugToken(token);
    console.log('debugToken result:', res);
  } catch (err) {
    console.log('debugToken error:', err.message, err.rawMetaCode);
  }
  process.exit(0);
}
main().catch(console.error);
