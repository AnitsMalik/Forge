import { metaSelfService } from '../apps/api/dist/services/connections/metaSelfService.service.js';
import { db } from '../apps/api/dist/db/connection.js';

const brand = await db('brands').where({ id: '52f09a1e-e490-4c01-9674-4eb729bd5108' }).first();
const tenant = await db('tenants').where({ id: brand.tenant_id }).first();
const user = await db('users').first();

console.log('Testing getAuthorizationUrl for brand:', brand.name, `(${brand.id})`);
const authData = await metaSelfService.getAuthorizationUrl({
  tenantId: tenant.id,
  brandId: brand.id,
  userId: user.id,
});

console.log('\n--- OFFICIAL META OAUTH URL ---');
console.log(authData.authorizationUrl);
console.log('-------------------------------\n');
process.exit(0);
