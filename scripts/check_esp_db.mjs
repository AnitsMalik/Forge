import db from '../apps/api/dist/db.js';

async function check() {
  const configs = await db('email_esp_configs').select('id', 'provider', 'brand_id', 'is_active', 'domain');
  console.log('Current DB configs:', JSON.stringify(configs, null, 2));
  process.exit(0);
}

check().catch(console.error);

