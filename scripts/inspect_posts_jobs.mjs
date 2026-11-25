import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
  const jobs = await db('publishing_jobs').where({ brand_id: brandId }).orderBy('created_at', 'desc').limit(5);
  console.log('=== PUBLISHING JOBS ===');
  for (const j of jobs) {
    console.log({
      id: j.id,
      platform: j.platform,
      account_id: j.account_id,
      status: j.status,
      attempt_count: j.attempt_count,
      last_error: j.last_error,
      created_at: j.created_at,
    });
  }

  const posts = await db('posts').where({ brand_id: brandId }).orderBy('created_at', 'desc').limit(5);
  console.log('\n=== POSTS ===');
  for (const p of posts) {
    console.log({
      id: p.id,
      title: p.title,
      status: p.status,
      created_at: p.created_at,
    });
    const variants = await db('post_variants').where({ post_id: p.id });
    for (const v of variants) {
      console.log('  Variant:', {
        id: v.id,
        platform: v.platform,
        status: v.status,
        remote_post_id: v.remote_post_id,
        remote_post_url: v.remote_post_url,
      });
    }
  }

  const logs = await db('publish_logs').orderBy('created_at', 'desc').limit(10);
  console.log('\n=== RECENT PUBLISH LOGS ===');
  for (const l of logs) {
    console.log({
      id: l.id,
      post_variant_id: l.post_variant_id,
      status: l.status,
      http_status: l.http_status,
      error_message: l.error_message,
      created_at: l.created_at,
    });
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
