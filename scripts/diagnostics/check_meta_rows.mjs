import { db } from '../apps/api/dist/db/connection.js';

async function checkMetaRows() {
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
  const conns = await db('meta_connections').where({ brand_id: brandId });
  console.log('meta_connections:', conns.map(c => ({
    id: c.id,
    brand_id: c.brand_id,
    selected_page_id: c.selected_page_id,
    selected_page_name: c.selected_page_name,
    instagram_account_id: c.instagram_account_id,
    status: c.status,
    hasUserToken: !!c.encrypted_user_access_token,
    hasPageToken: !!c.encrypted_page_access_token,
  })));

  const pages = await db('meta_facebook_pages');
  console.log('meta_facebook_pages:', pages.map(p => ({
    page_id: p.page_id,
    name: p.name,
    hasIg: !!p.instagram_business_account_id,
    igId: p.instagram_business_account_id,
    is_selected: p.is_selected,
    hasToken: !!p.encrypted_access_token,
  })));

  const igs = await db('meta_instagram_accounts');
  console.log('meta_instagram_accounts:', igs.map(i => ({
    instagram_account_id: i.instagram_account_id,
    username: i.username,
    name: i.name,
    page_id: i.page_id,
  })));

  await db.destroy();
}
checkMetaRows().catch(console.error);
