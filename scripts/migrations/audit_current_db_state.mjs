import { db } from '../apps/api/dist/db/connection.js';
import { isRealExternalPostId, isSandboxUrl, isRealPublication } from '@socialforge/shared';

async function main() {
  console.log('--- POST VARIANTS ---');
  const variants = await db('post_variants').select('id', 'post_id', 'platform', 'status', 'remote_post_id', 'remote_post_url');
  const variantStatusCounts = {};
  for (const v of variants) {
    variantStatusCounts[v.status] = (variantStatusCounts[v.status] || 0) + 1;
  }
  console.log('Variant statuses:', variantStatusCounts);
  const realPubVariants = variants.filter(v => isRealPublication(v));
  console.log('Real publication variants count:', realPubVariants.length, realPubVariants);
  const fakePublishedVariants = variants.filter(v => v.status === 'published' && !isRealPublication(v));
  console.log('Fake published variants (status=published but not real):', fakePublishedVariants.length, fakePublishedVariants);

  console.log('\n--- POSTS ---');
  const posts = await db('posts').select('id', 'brand_id', 'status');
  const postStatusCounts = {};
  for (const p of posts) {
    postStatusCounts[p.status] = (postStatusCounts[p.status] || 0) + 1;
  }
  console.log('Post statuses:', postStatusCounts);

  console.log('\n--- PUBLISHING JOBS ---');
  const jobs = await db('publishing_jobs').select('id', 'post_id', 'content_id', 'status', 'external_post_id');
  const jobStatusCounts = {};
  for (const j of jobs) {
    jobStatusCounts[j.status] = (jobStatusCounts[j.status] || 0) + 1;
  }
  console.log('Job statuses:', jobStatusCounts);
  const publishedJobs = jobs.filter(j => j.status === 'published');
  console.log('Published jobs:', publishedJobs);

  console.log('\n--- META CONNECTIONS ---');
  const conns = await db('meta_connections').select('id', 'tenant_id', 'brand_id', 'selected_page_id', 'status');
  console.log('Meta connections:', conns);

  console.log('\n--- SOCIAL ACCOUNTS ---');
  const socialAccounts = await db('social_accounts').select('id', 'brand_id', 'platform', 'platform_account_id', 'account_name', 'status');
  console.log('Social accounts:', socialAccounts);

  await db.destroy();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
