import { db } from '../apps/api/dist/db/connection.js';
async function main() {
  const moCols = await db.raw('DESCRIBE marketing_objects');
  console.log('marketing_objects:', moCols[0].map(c => c.Field));
  const crCols = await db.raw('DESCRIBE connector_resources');
  console.log('connector_resources:', crCols[0].map(c => c.Field));
  process.exit(0);
}
main().catch(console.error);
