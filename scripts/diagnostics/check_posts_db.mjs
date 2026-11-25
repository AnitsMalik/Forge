import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  const publishedMetaVariants = await db('post_variants')
    .join('posts', 'post_variants.post_id', 'posts.id')
    .where('posts.brand_id', '52f09a1e-e490-4c01-9674-4eb729bd5108')
    .whereIn('post_variants.platform', ['facebook', 'instagram'])
    .where('post_variants.status', 'published')
    .select('post_variants.id', 'post_variants.platform', 'post_variants.remote_post_id', 'post_variants.remote_post_url', 'posts.title', 'posts.published_at');
  console.log('publishedMetaVariants:', publishedMetaVariants);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
