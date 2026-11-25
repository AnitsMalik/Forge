import { db } from '../apps/api/dist/db/connection.js';

async function restore() {
  const c = await db('meta_connections').where({ id: '1a8e22dc-5f03-4e0b-8b4d-a7a8804d7adf' }).first();
  await db('meta_facebook_pages')
    .where({ id: '63637b4c-4f16-43f3-a0b1-88fa31f8f631' })
    .update({
      encrypted_access_token: c.encrypted_page_access_token,
      updated_at: new Date()
    });
  console.log('Restored meta_facebook_pages real encrypted token from connection.');
  process.exit(0);
}
restore().catch(console.error);
