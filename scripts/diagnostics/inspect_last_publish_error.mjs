import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  const jobs = await db('publishing_jobs').orderBy('created_at', 'desc').limit(3);
  console.log('--- Publishing Jobs ---');
  for (const j of jobs) {
    console.log({
      id: j.id,
      brand_id: j.brand_id,
      platform: j.platform,
      account_id: j.account_id,
      status: j.status,
      last_error: j.last_error,
      created_at: j.created_at,
    });
  }

  const job = await db('publishing_jobs').where({ id: 'f19abf26-e739-4805-b007-83cf51938002' }).first();
  console.log('JOB PAYLOAD:', job?.payload);

  const audits = await db('publishing_audit_logs').where('metadata', 'like', '%f19abf26%').orWhere('id', 'f19abf26-e739-4805-b007-83cf51938002');
  console.log('AUDITS:', audits);

  const recentAudits = await db('publishing_audit_logs').orderBy('created_at', 'desc').limit(3);
  console.log('RECENT AUDITS:', recentAudits);

  const conns = await db('meta_connections').where({ brand_id: '52f09a1e-e490-4c01-9674-4eb729bd5108' }).select('id', 'status', 'metadata', 'selected_page_id');
  console.log('--- Meta Connection ---');
  console.log(conns);

  process.exit(0);
}

main().catch(console.error);
