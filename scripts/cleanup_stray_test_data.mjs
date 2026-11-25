import { db } from '../apps/api/dist/db/connection.js';

async function cleanup() {
  const strayTenants = await db('tenants')
    .where('slug', 'like', 'lockout-agency-%')
    .orWhere('slug', 'like', 'sec-agency-%')
    .orWhere('slug', 'like', 'quota-test-%')
    .orWhere('slug', 'like', 'api-entitlement-%')
    .orWhere('slug', 'like', 'entitlement-test-%')
    .select('id');

  const ids = strayTenants.map(t => t.id);
  console.log(`Found ${ids.length} stray test tenants to clean up`);

  if (ids.length > 0) {
    await db('social_accounts').whereIn('tenant_id', ids).del();
    await db('brands').whereIn('tenant_id', ids).del();
    await db('tenant_usage_counters').whereIn('tenant_id', ids).del();
    await db('tenant_subscriptions').whereIn('tenant_id', ids).del();
    await db('tenant_users').whereIn('tenant_id', ids).del();
    await db('tenants').whereIn('id', ids).del();
  }

  // Also clean up any test users
  await db('users').where('email', 'like', '%@test.com').del();

  console.log('Cleanup complete.');
  process.exit(0);
}

cleanup();
