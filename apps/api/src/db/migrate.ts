import knex from 'knex';
import config from './knexfile.js';

const env = process.env.NODE_ENV || 'development';
const db = knex(config[env] || config.development);

async function run() {
  console.log('Running database migrations on socialforge_db...');
  const [batchNo, log] = await db.migrate.latest();
  if (log.length === 0) {
    console.log('Already up to date. No new migrations.');
  } else {
    console.log(`Batch ${batchNo} completed: ${log.length} migration(s) applied:`);
    log.forEach((file: string) => console.log(`  ✓ ${file}`));
  }
  await db.destroy();
}

run().catch(async (err) => {
  console.error('Migration failed:', err);
  await db.destroy();
  process.exit(1);
});
