import mysql from 'mysql2/promise';
const c = await mysql.createConnection({ host: '127.0.0.1', port: 3308, user: 'root', password: 'root', database: 'socialforge_db' });

// 1. Remove stale duplicate connection for Echo Sound Labs (36cf4548-f9b9-4f3e-ba02-dacea2cb44d6)
await c.query("DELETE FROM meta_facebook_pages WHERE connection_id = 'c98e46a4-5ae5-40bc-a92e-b53a44a64d29'");
await c.query("DELETE FROM meta_connections WHERE id = 'c98e46a4-5ae5-40bc-a92e-b53a44a64d29'");
await c.query("DELETE FROM social_accounts WHERE brand_id = '36cf4548-f9b9-4f3e-ba02-dacea2cb44d6' AND platform = 'facebook'");

// 2. Resolve conflict on HOASP International
await c.query("UPDATE meta_connections SET status = 'reauth_required', updated_at = NOW() WHERE brand_id = '52f09a1e-e490-4c01-9674-4eb729bd5108'");

console.log('Cleaned up stale duplicate ownership and reset HOASP connection to clean state.');

const [remaining] = await c.query("SELECT id, brand_id, tenant_id, selected_page_id, status FROM meta_connections WHERE selected_page_id = '1405588742634526'");
console.log('REMAINING OWNERS FOR PAGE 1405588742634526:', remaining);

await c.end();
