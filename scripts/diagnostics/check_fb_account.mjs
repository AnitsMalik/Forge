import { db } from '../apps/api/dist/db/connection.js';

async function checkFbAccount() {
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
  const sa = await db('social_accounts').where({ brand_id: brandId, platform: 'facebook' }).first();
  console.log('Facebook social_account:', sa);
  const conn = await db('meta_connections').where({ brand_id: brandId }).first();
  console.log('Meta connection:', conn);
  await db.destroy();
}

checkFbAccount().catch(console.error);
