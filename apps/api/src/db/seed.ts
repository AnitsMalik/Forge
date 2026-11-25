import knex from 'knex';
import config from './knexfile.js';

const env = process.env.NODE_ENV || 'development';
const db = knex(config[env] || config.development);

async function run() {
  console.log('Running database seeds on socialforge_db...');
  const [log] = await db.seed.run();
  if (log.length === 0) {
    console.log('No seed files found or executed.');
  } else {
    console.log(`Executed ${log.length} seed file(s):`);
    log.forEach((file: string) => console.log(`  ✓ ${file}`));
  }
  await db.destroy();
}

run().catch(async (err) => {
  console.error('Seed failed:', err);
  await db.destroy();
  process.exit(1);
});
