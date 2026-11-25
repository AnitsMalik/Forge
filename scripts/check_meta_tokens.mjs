import dotenv from 'dotenv';
dotenv.config();
import { db } from '../apps/api/dist/db/connection.js';
import { decryptSecret, isEncryptedSecret } from '../apps/api/dist/services/cryptoVault.js';

async function checkMetaTokens() {
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';

  // 1. Check social_accounts
  const fbAccount = await db('social_accounts').where({ brand_id: brandId, platform: 'facebook' }).first();
  console.log('FB social_account:', {
    id: fbAccount?.id,
    is_active: fbAccount?.is_active,
    account_id: fbAccount?.account_id,
    account_name: fbAccount?.account_name,
    hasToken: !!fbAccount?.access_token_encrypted,
  });

  if (fbAccount?.access_token_encrypted) {
    let t = fbAccount.access_token_encrypted;
    if (isEncryptedSecret(t)) t = decryptSecret(t);
    console.log('FB DB token length:', t.length, 'starts with:', t.slice(0, 10));
  }

  // 2. Check meta_connections / integrations
  const metaConn = await db('meta_connections').where({ brand_id: brandId }).first();
  console.log('meta_connections found:', !!metaConn);
  if (metaConn) {
    console.log('meta_connections:', {
      id: metaConn.id,
      status: metaConn.status,
      user_id: metaConn.meta_user_id,
      name: metaConn.meta_user_name,
    });
    let t = metaConn.access_token_encrypted;
    if (t && isEncryptedSecret(t)) t = decryptSecret(t);
    console.log('meta_connections token length:', t?.length, 'starts with:', t?.slice(0, 10));
  }

  // 3. Check env META_DEV_ACCESS_TOKEN
  const envToken = process.env.META_DEV_ACCESS_TOKEN;
  console.log('META_DEV_ACCESS_TOKEN in env:', !!envToken, 'length:', envToken?.length, 'starts with:', envToken?.slice(0, 10));

  await db.destroy();
}
checkMetaTokens().catch(console.error);
