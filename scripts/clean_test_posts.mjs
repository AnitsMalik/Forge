import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  const p = await db('posts').where('title', 'Production Check Analytics Post').select('id');
  for (const row of p) {
    await db('post_analytics_metrics').where({ post_id: row.id }).delete();
    await db('post_analytics_snapshots').where({ post_id: row.id }).delete();
    await db('post_variants').where({ post_id: row.id }).delete();
    await db('posts').where({ id: row.id }).delete();
  }
  console.log('Cleaned up dangling test posts:', p.length);
  process.exit(0);
}

main();
