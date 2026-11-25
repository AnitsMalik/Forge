import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  const [cols] = await db.raw('DESCRIBE social_accounts');
  console.log('social_accounts columns:', cols.map(c => c.Field));
  const accounts = await db('social_accounts').select('*');
  console.log('social_accounts count:', accounts.length);
  for (const acc of accounts) {
    console.log(`- ID: ${acc.id}, Brand: ${acc.brand_id}, Platform: ${acc.platform}, AccountId: ${acc.account_id || acc.platform_user_id || acc.username}, Status: ${acc.status}`);
  }
  await db.destroy();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
