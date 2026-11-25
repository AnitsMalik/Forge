import dotenv from 'dotenv';
dotenv.config({ path: 'f:/SocialAgent/.env' });
import { db } from '../apps/api/dist/db/connection.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';
import { metaClient } from '../apps/api/dist/services/meta/metaClient.js';

async function main() {
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
  const targetPageId = '1405588742634526';

  const conn = await db('meta_connections').where({ brand_id: brandId }).first();
  console.log('Conn:', { id: conn?.id, status: conn?.status, pageId: conn?.selected_page_id });

  const fbPage = await db('meta_facebook_pages').where({ connection_id: conn?.id, page_id: targetPageId }).first();
  console.log('FB Page in DB:', { id: fbPage?.id, name: fbPage?.name, hasToken: Boolean(fbPage?.encrypted_access_token) });

  const tokenEnc = fbPage?.encrypted_access_token || conn?.encrypted_page_access_token;
  if (!tokenEnc) {
    console.log('No token found in DB');
    return;
  }

  const token = metaTokenManager.decryptToken(tokenEnc);
  console.log('Token length:', token.length, 'prefix:', token.substring(0, 10));

  // Test debug_token
  try {
    const debug = await metaTokenManager.debugToken(token);
    console.log('Debug token result:', debug);
  } catch (e) {
    console.log('Debug token error:', e.message);
  }

  // Test GET /{page-id}?fields=id,name
  try {
    const res = await metaClient.get(`${targetPageId}`, { fields: 'id,name' }, token);
    console.log('Page validation response:', res);
  } catch (err) {
    console.log('Page validation error:', {
      message: err.message,
      code: err.code,
      metaCode: err.metaCode,
      rawMetaCode: err.rawMetaCode,
      metaSubcode: err.metaSubcode,
      technicalDetails: err.technicalDetails,
    });
  }
}

main().catch(console.error);
