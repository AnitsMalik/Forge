import { db } from './dist/db/connection.js';
import { metaTokenManager } from './dist/services/meta/tokenManager.js';

async function checkToken() {
  const conn = await db('meta_connections').where({ brand_id: '52f09a1e-e490-4c01-9674-4eb729bd5108' }).first();
  const page = await db('meta_facebook_pages').where({ connection_id: conn.id, page_id: '1405588742634526' }).first();
  const sa = await db('social_accounts').where({ brand_id: '52f09a1e-e490-4c01-9674-4eb729bd5108', platform: 'facebook' }).first();

  console.log('Conn encrypted_page_access_token exists:', !!conn.encrypted_page_access_token);
  console.log('Page encrypted_access_token exists:', !!page?.encrypted_access_token);
  console.log('SA access_token_encrypted exists:', !!sa?.access_token_encrypted);

  const pageToken = metaTokenManager.decryptToken(page.encrypted_access_token);
  const connToken = metaTokenManager.decryptToken(conn.encrypted_page_access_token);
  const saToken = metaTokenManager.decryptToken(sa.access_token_encrypted);

  console.log('Tokens equal:', pageToken === connToken && connToken === saToken);
  console.log('Token starts with EAAG:', pageToken?.startsWith('EAAG'));
  console.log('Token is simulated:', pageToken?.includes('simulated'));

  await db.destroy();
}

checkToken().catch(console.error);
