import { db } from './dist/db/connection.js';

async function checkCols() {
  const cols = await db('subscription_plans').columnInfo();
  console.log('subscription_plans columns:', Object.keys(cols));
  const starter = await db('subscription_plans').where({ id: 'starter' }).first();
  console.log('starter row:', starter);
  await db.destroy();
}

checkCols().catch(console.error);
