import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  const brands = await db('brands');
  console.log('=== BRANDS ===');
  for (const b of brands) {
    console.log({ id: b.id, name: b.name, slug: b.slug, tenant_id: b.tenant_id });
  }

  const conns = await db('meta_connections');
  console.log('=== META_CONNECTIONS ===');
  for (const c of conns) {
    console.log(JSON.stringify({
      id: c.id,
      brand_id: c.brand_id,
      selected_page_id: c.selected_page_id,
      selected_page_name: c.selected_page_name,
      status: c.status,
      credential_expires_at: c.credential_expires_at,
      instagram_account_id: c.instagram_account_id,
      instagram_username: c.instagram_username,
      metadata: typeof c.metadata === 'string' ? JSON.parse(c.metadata || '{}') : c.metadata,
    }, null, 2));
  }

  const sa = await db('social_accounts').whereIn('platform', ['facebook', 'instagram']);
  console.log('\n=== SOCIAL_ACCOUNTS ===');
  for (const s of sa) {
    console.log({
      id: s.id,
      brand_id: s.brand_id,
      platform: s.platform,
      account_name: s.account_name,
      account_id: s.account_id,
      is_active: s.is_active,
      token_expires_at: s.token_expires_at,
      metadata: typeof s.metadata === 'string' ? JSON.parse(s.metadata || '{}') : s.metadata,
    });
  }

  const ig = await db('meta_instagram_accounts');
  console.log('\n=== META_INSTAGRAM_ACCOUNTS ===');
  console.log(ig);

  const pages = await db('meta_facebook_pages');
  console.log('\n=== META_FACEBOOK_PAGES ===');
  for (const p of pages) {
    console.log({
      id: p.id,
      page_id: p.page_id,
      name: p.name,
      is_selected: p.is_selected,
    });
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
