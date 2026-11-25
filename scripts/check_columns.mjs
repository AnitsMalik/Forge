import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: 'f:/SocialAgent/.env' });

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3308,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'socialforge_db'
  });

  const [brands] = await conn.execute("SELECT id, name, slug, tenant_id FROM brands");
  console.log('brands:', brands);

  const [colsPages] = await conn.execute('DESCRIBE meta_facebook_pages');
  console.log('meta_facebook_pages:', colsPages.map(c => c.Field));

  const [colsSocial] = await conn.execute('DESCRIBE social_accounts');
  console.log('social_accounts:', colsSocial.map(c => c.Field));

  const [metaConnRows] = await conn.execute("SELECT id, brand_id, selected_page_id, selected_page_name, updated_at, encrypted_user_access_token IS NOT NULL as hasUserToken, encrypted_page_access_token IS NOT NULL as hasPageToken FROM meta_connections");
  console.log('metaConnRows:', metaConnRows);

  const [metaPageRows] = await conn.execute("SELECT id, connection_id, page_id, name, is_selected, updated_at FROM meta_facebook_pages");
  console.log('metaPageRows:', metaPageRows);

  const [socialRows] = await conn.execute("SELECT id, brand_id, platform, account_name, account_id, is_active, updated_at FROM social_accounts");
  console.log('socialRows:', socialRows);

  await conn.end();
}

main().catch(console.error);
