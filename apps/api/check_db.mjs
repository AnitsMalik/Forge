import { db } from './dist/db/connection.js';

async function check() {
  const brand = await db('brands').where({ id: '52f09a1e-e490-4c01-9674-4eb729bd5108' }).first();
  const conns = await db('meta_connections').where({ brand_id: '52f09a1e-e490-4c01-9674-4eb729bd5108' });
  const pages = await db('meta_facebook_pages').whereIn('connection_id', conns.map(c => c.id));
  const sa = await db('social_accounts').where({ brand_id: '52f09a1e-e490-4c01-9674-4eb729bd5108' });
  console.log('Brand:', brand?.name, brand?.id);
  console.log('Connections count:', conns.length);
  for (const c of conns) {
    console.log('Conn:', c.id, 'status:', c.status, 'selected_page_id:', c.selected_page_id, 'meta_user_id:', c.meta_user_id);
  }
  console.log('Pages count:', pages.length);
  for (const p of pages) {
    console.log('Page:', p.page_id, p.page_name, 'conn:', p.connection_id, 'has_token:', !!p.encrypted_access_token);
  }
  console.log('Social Accounts count:', sa.length);
  for (const s of sa) {
    console.log('SA:', s.id, s.platform, s.account_id, s.account_name, 'is_active:', s.is_active);
  }
  const lastLogs = await db('publish_logs').orderBy('created_at', 'desc').limit(5);
  console.log('Last publish logs:');
  for (const l of lastLogs) {
    console.log('Log:', l.status, l.http_status, l.error_message, l.response_payload);
  }
  await db.destroy();
}

check().catch(console.error);
