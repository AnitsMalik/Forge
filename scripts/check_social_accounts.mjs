import { db } from '../apps/api/dist/db/connection.js';
async function run() {
  const accs = await db('social_accounts').select('id', 'brand_id', 'platform', 'account_name', 'account_id', 'is_active', 'metadata');
  console.log(JSON.stringify(accs, null, 2));
  process.exit(0);
}
run().catch(console.error);
