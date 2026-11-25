const path = require('path');
const knex = require('knex');
const knexConfig = require(path.join(__dirname, 'knexfile.js'));
const db = knex(knexConfig.development || knexConfig);

async function inspect() {
  const plans = await db('subscription_plans').select('*');
  console.log(`Found ${plans.length} subscription plans in DB:`);
  for (const p of plans) {
    console.log(JSON.stringify({
      id: p.id,
      name: p.name,
      price: p.price,
      max_brands: p.max_brands,
      max_users: p.max_users,
      max_social_accounts: p.max_social_accounts,
      max_posts_per_month: p.max_posts_per_month,
      storage_bytes_limit: p.storage_bytes_limit,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    }, null, 2));
  }
  await db.destroy();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
