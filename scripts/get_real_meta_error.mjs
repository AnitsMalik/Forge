import { db } from '../apps/api/dist/db/connection.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { redactTokens } from '../apps/api/dist/services/meta/errors.js';

async function main() {
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
  const targetPageId = '1405588742634526';

  const conn = await db('meta_connections').where({ brand_id: brandId }).first();
  const fbPage = await db('meta_facebook_pages').where({ connection_id: conn?.id, page_id: targetPageId }).first();
  const tokenEnc = fbPage?.encrypted_access_token || conn?.encrypted_page_access_token;
  const token = metaTokenManager.decryptToken(tokenEnc);

  const url = `https://graph.facebook.com/v20.0/${targetPageId}?fields=id,name&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const data = await res.json();

  console.log('HTTP STATUS:', res.status);
  console.log('META ERROR CODE:', data?.error?.code);
  console.log('META ERROR TYPE:', data?.error?.type);
  console.log('META MESSAGE:', redactTokens(data?.error?.message || ''));
  console.log('FBTRACE ID:', data?.error?.fbtrace_id);

  process.exit(0);
}

main().catch(console.error);
