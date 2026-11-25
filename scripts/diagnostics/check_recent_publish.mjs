import { db } from '../apps/api/dist/db/connection.js';

async function checkRecentPublish() {
  const posts = await db('posts').orderBy('created_at', 'desc').limit(5);
  console.log('Recent posts:');
  for (const p of posts) {
    console.log(`\nPost ID: ${p.id} | Title: "${p.title}" | Status: ${p.status} | Created: ${p.created_at} | Published: ${p.published_at}`);
    const variants = await db('post_variants').where({ post_id: p.id });
    for (const v of variants) {
      console.log(`  Variant [${v.platform}]: status=${v.status} | remote_id=${v.remote_post_id} | url=${v.remote_post_url}`);
      const logs = await db('publish_logs').where({ post_variant_id: v.id }).orderBy('created_at', 'desc').limit(2);
      for (const l of logs) {
        console.log(`    Log: status=${l.status} | http=${l.http_status} | error=${l.error_message} | payload=${typeof l.response_payload === 'string' ? l.response_payload.slice(0, 200) : JSON.stringify(l.response_payload).slice(0, 200)}`);
      }
    }
  }
  await db.destroy();
}
checkRecentPublish().catch(console.error);
