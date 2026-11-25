import { db } from '../apps/api/dist/db/connection.js';
async function run() {
  const posts = await db('posts')
    .where({ brand_id: '52f09a1e-e490-4c01-9674-4eb729bd5108' })
    .orderBy('created_at', 'desc')
    .limit(5);

  for (const p of posts) {
    const variants = await db('post_variants').where({ post_id: p.id });
    console.log('POST:', p.id, p.title, p.status, p.published_at);
    for (const v of variants) {
      console.log('  VARIANT:', v.id, v.platform, v.status, v.remote_post_id, v.remote_post_url, v.platform_specific_config);
    }
  }
  process.exit(0);
}
run().catch(console.error);
