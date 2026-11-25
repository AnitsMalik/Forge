import { db } from '../apps/api/dist/db/connection.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { decryptSecret } from '../apps/api/dist/services/cryptoVault.js';

async function main() {
  const p = await db('meta_facebook_pages').where({ id: '63637b4c-4f16-43f3-a0b1-88fa31f8f631' }).first();
  const token = decryptSecret(p.encrypted_access_token);
  console.log('Token length:', token.length, 'prefix:', token.slice(0, 15));
  try {
    const res = await metaTokenManager.debugToken(token);
    console.log('debugToken result:', res);
  } catch (err) {
    console.log('debugToken error:', err.message, err.rawMetaCode);
  }
  process.exit(0);
}
main().catch(console.error);
