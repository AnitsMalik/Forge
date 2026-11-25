import { db } from '../apps/api/dist/db/connection.js';
import { config } from '../apps/api/dist/config/index.js';
import { metaTokenManager } from '../apps/api/dist/services/meta/tokenManager.js';

const BRAND_ID = '52f09a1e-e490-4c01-9674-4eb729bd5108'; // HOASP International

try {
  const conn = await db('meta_connections').where({ brand_id: BRAND_ID }).first();
  if (!conn || !conn.encrypted_page_access_token) {
    console.error('No encrypted_page_access_token found in meta_connections for HOASP International.');
    process.exit(1);
  }

  const decryptedPageToken = metaTokenManager.decryptToken(conn.encrypted_page_access_token);
  const maskedToken = metaTokenManager.maskToken(decryptedPageToken);
  const appId = config.meta.appId || '1785874552561096';
  const appSecret = config.meta.appSecret;
  const appToken = `${appId}|${appSecret}`;

  console.log(`Inspecting live Page Access Token (${maskedToken}) for Page ${conn.selected_page_id}...`);
  const res = await fetch(`https://graph.facebook.com/v20.0/debug_token?input_token=${encodeURIComponent(decryptedPageToken)}&access_token=${encodeURIComponent(appToken)}`);
  const data = await res.json();
  console.log('META GRAPH API DEBUG_TOKEN RESULT:', JSON.stringify(data, null, 2));
} finally {
  await db.destroy();
}
