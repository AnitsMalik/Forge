import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  const pages = await db('meta_facebook_pages').where({ page_id: '1405588742634526' });
  console.log(pages.map(p => ({
    id: p.id,
    connection_id: p.connection_id,
    name: p.name,
    ig_id: p.instagram_business_account_id,
    is_selected: p.is_selected,
    created_at: p.created_at,
    updated_at: p.updated_at
  })));
  process.exit(0);
}

main().catch(console.error);
