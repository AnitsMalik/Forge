import { db } from '../apps/api/dist/db/connection.js';

async function check() {
  const tenants = await db('tenants').select('id', 'name');
  const subs = await db('tenant_subscriptions').select('tenant_id');
  const subTenants = new Set(subs.map(s => s.tenant_id));
  
  for (const t of tenants) {
    if (!subTenants.has(t.id)) {
      console.log('Orphan tenant missing subscription:', t.id, t.name);
      // Clean up orphaned test tenants
      if (t.name.includes('Test') || t.name.includes('Alpha') || t.name.includes('Beta') || t.name.includes('Stripe') || t.name.includes('Connect Hub')) {
        console.log('Cleaning up orphaned test tenant:', t.id);
        await db('tenants').where({ id: t.id }).delete();
      }
    }
  }
  await db.destroy();
}

check();
