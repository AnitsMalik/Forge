import { db } from '../apps/api/dist/db/connection.js';

async function reactivateFacebook() {
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
  const updated = await db('social_accounts')
    .where({ brand_id: brandId, platform: 'facebook' })
    .update({ is_active: 1, updated_at: new Date() });
  console.log('Reactivated Facebook social_account count:', updated);
  await db.destroy();
}

reactivateFacebook().catch(console.error);
