import mysql from 'mysql2/promise';
const c = await mysql.createConnection({ host: '127.0.0.1', port: 3308, user: 'root', password: 'root', database: 'socialforge_db' });
const [mc] = await c.query("SELECT * FROM meta_connections WHERE selected_page_id = '1405588742634526'");
console.log('meta_connections for HOASP:', mc[0]);

if (mc[0]) {
  await c.query(`
    UPDATE social_connections 
    SET status = 'CONNECTED', 
        account_name = 'HOASP International', 
        provider_account_id = '1405588742634526',
        last_error = NULL
    WHERE brand_id = '52f09a1e-e490-4c01-9674-4eb729bd5108' AND provider = 'facebook'
  `);
  console.log('Updated social_connections for Facebook to CONNECTED');
}

const [sc] = await c.query("SELECT id, brand_id, provider, account_name, status FROM social_connections WHERE brand_id = '52f09a1e-e490-4c01-9674-4eb729bd5108'");
console.log('social_connections for brand:', sc);
await c.end();

