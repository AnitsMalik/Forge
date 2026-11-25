import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  const [rows] = await db.raw('SHOW TABLES');
  console.log('TABLES:', rows.map(r => Object.values(r)[0]));
  await db.destroy();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
