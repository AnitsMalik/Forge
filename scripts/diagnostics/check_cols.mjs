import { db } from '../apps/api/dist/db/connection.js';
async function main() {
  const c = await db('meta_connections').first();
  console.log('meta_connections cols:', c ? Object.keys(c) : 'empty');
  const p = await db('meta_facebook_pages').first();
  console.log('meta_facebook_pages cols:', p ? Object.keys(p) : 'empty');
  const sa = await db('social_accounts').where({ platform: 'facebook' }).first();
  console.log('social_accounts cols:', sa ? Object.keys(sa) : 'empty');
  process.exit(0);
}
main().catch(console.error);
