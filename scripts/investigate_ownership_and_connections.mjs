import { db } from '../apps/api/dist/db/connection.js';

async function run() {
  console.log('=== BRAND & TENANT DETAILS FOR CONNECTIONS ===');
  const b1 = await db('brands').where({ id: '52f09a1e-e490-4c01-9674-4eb729bd5108' }).first();
  const t1 = await db('tenants').where({ id: '1d9190fa-bd85-4304-8e73-8ef3ca62c342' }).first();
  console.log('Connection 1 (Status: connected):');
  console.log('  Brand:', b1 ? { id: b1.id, name: b1.name, slug: b1.slug } : 'Not found');
  console.log('  Tenant:', t1 ? { id: t1.id, name: t1.name, slug: t1.slug } : 'Not found');

  const b2 = await db('brands').where({ id: '36cf4548-f9b9-4f3e-ba02-dacea2cb44d6' }).first();
  const t2 = await db('tenants').where({ id: 'fca25262-3a1f-460c-8288-6ce99c4c96f2' }).first();
  console.log('\nConnection 2 (Status: ownership_conflict):');
  console.log('  Brand:', b2 ? { id: b2.id, name: b2.name, slug: b2.slug } : 'Not found');
  console.log('  Tenant:', t2 ? { id: t2.id, name: t2.name, slug: t2.slug } : 'Not found');

  console.log('\n=== ALL BRANDS IN DB ===');
  const allBrands = await db('brands').select('id', 'tenant_id', 'name', 'slug');
  console.log(JSON.stringify(allBrands, null, 2));

  await db.destroy();
}

run().catch(console.error);
