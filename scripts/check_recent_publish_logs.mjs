import { db } from '../apps/api/dist/db/connection.js';
async function run() {
  const logs = await db('publish_logs')
    .orderBy('created_at', 'desc')
    .limit(6);
  console.log(JSON.stringify(logs, null, 2));
  process.exit(0);
}
run().catch(console.error);
