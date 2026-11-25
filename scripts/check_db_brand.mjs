import { db } from '../apps/api/dist/db/connection.js';

async function check() {
  const users = await db('users').select('id', 'email').limit(5);
  console.log('Users:', users);
  const brands = await db('brands').select('id', 'name', 'slug').limit(5);
  console.log('Brands:', brands);
  process.exit(0);
}
check();
