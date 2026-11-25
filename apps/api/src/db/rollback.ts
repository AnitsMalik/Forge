import knex from 'knex';
import config from './knexfile.js';

const db = knex(config.development);

async function run() {
  console.log('Rolling back last migration batch on socialforge_db...');
  const [batchNo, log] = await db.migrate.rollback();
  if (log.length === 0) {
    console.log('Already at the base migration.');
  } else {
    console.log(`Reverted batch ${batchNo}: ${log.length} migration(s):`);
    log.forEach((file: string) => console.log(`  ↩ ${file}`));
  }
  await db.destroy();
}

run().catch(async (err) => {
  console.error('Rollback failed:', err);
  await db.destroy();
  process.exit(1);
});
