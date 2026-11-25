import { db } from '../apps/api/dist/db/connection.js';

async function checkMetaIntegration() {
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
  const conn = await db('meta_connections').where({ brand_id: brandId }).first();
  console.log('meta_connections row:', conn);
  const pages = await db('facebook_pages').where({ brand_id: brandId });
  console.log('facebook_pages rows:', pages);
  await db.destroy();
}
checkMetaIntegration().catch(console.error);
