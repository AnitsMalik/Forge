import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  const brands = await db('brands').select('id', 'name', 'slug');
  console.log('BRANDS:', brands);
  process.exit(0);
}
main();
