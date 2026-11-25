import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  console.log('--- SOCIAL ACCOUNTS TENANT ID CHECK ---');
  const accounts = await db('social_accounts')
    .join('brands', 'social_accounts.brand_id', 'brands.id')
    .select('social_accounts.id', 'social_accounts.brand_id', 'social_accounts.tenant_id as sa_tenant', 'brands.tenant_id as brand_tenant');
  console.table(accounts);
  const mismatched = accounts.filter(a => a.sa_tenant !== a.brand_tenant || !a.sa_tenant);
  console.log('Mismatched or null tenant_id in social_accounts:', mismatched.length);

  console.log('\n--- SUBSCRIPTION PLANS ---');
  const plans = await db('subscription_plans').select('id', 'name', 'monthly_price_cents', 'max_brands', 'max_social_accounts', 'max_posts_per_month');
  console.table(plans);

  console.log('\n--- TENANT SUBSCRIPTIONS (BACKFILLED) ---');
  const subs = await db('tenant_subscriptions')
    .join('tenants', 'tenant_subscriptions.tenant_id', 'tenants.id')
    .select('tenant_subscriptions.id', 'tenants.name as tenant_name', 'tenant_subscriptions.plan_id', 'tenant_subscriptions.status');
  console.table(subs);

  await db.destroy();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
