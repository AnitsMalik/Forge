import { db } from './dist/db/connection.js';
import { metaTokenManager } from './dist/services/meta/tokenManager.js';
import { MetaClient } from './dist/services/meta/metaClient.js';
import { redactTokens } from './dist/services/meta/errors.js';

async function verifyRealMetaCall() {
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
  const targetPageId = '1405588742634526';

  console.log('=== VERIFYING REAL META CALL WITH DB INTEGRATION CREDENTIAL ===\n');

  // 1. Resolve token from DB
  const conn = await db('meta_connections').where({ brand_id: brandId }).first();
  const pageRec = await db('meta_facebook_pages').where({ connection_id: conn.id, page_id: targetPageId }).first();

  if (!pageRec || !pageRec.encrypted_access_token) {
    throw new Error('No encrypted token found in meta_facebook_pages');
  }

  const pageToken = metaTokenManager.decryptToken(pageRec.encrypted_access_token);
  console.log('1. DB Integration Check:');
  console.log(`   - Connection ID: ${conn.id}`);
  console.log(`   - Selected Page ID: ${conn.selected_page_id}`);
  console.log(`   - Target Page ID: ${targetPageId}`);
  console.log(`   - Page Token Exists: true`);
  console.log(`   - Page Token Redacted: ${redactTokens(pageToken)}`);

  // 2. Perform GET /{page-id}?fields=id,name directly against Meta Graph API
  const metaClient = new MetaClient({ testMode: false });
  console.log('\n2. Executing GET /' + targetPageId + '?fields=id,name against Meta Graph API:');

  try {
    const res = await metaClient.get(targetPageId, { fields: 'id,name' }, pageToken);
    console.log('   - Success Response:', res);
  } catch (err) {
    console.log('\n3. Real Meta Error Captured Safely:');
    console.log(`   - HTTP Status: ${err.httpStatus}`);
    console.log(`   - Meta Error Code: ${err.rawMetaCode ?? err.metaCode}`);
    console.log(`   - Meta Error Type: ${err.metaType}`);
    console.log(`   - Meta Message: ${redactTokens(err.safeMessage || err.message)}`);
    console.log(`   - FBTrace ID: ${err.fbtraceId}`);
    console.log(`   - Error Name: ${err.name}`);
    console.log(`   - AppError Code: ${err.code}`);
  }

  await db.destroy();
}

verifyRealMetaCall().catch(console.error);
