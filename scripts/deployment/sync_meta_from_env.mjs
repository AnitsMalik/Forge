import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import crypto from 'crypto';
import https from 'https';

dotenv.config({ path: 'f:/SocialAgent/.env' });

function resolveMasterKey() {
  const envKey = process.env.ENCRYPTION_MASTER_KEY;
  if (envKey) {
    if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
      return Buffer.from(envKey, 'hex');
    }
    return crypto.createHash('sha256').update(envKey).digest();
  }
  return crypto.createHash('sha256').update('socialforge-local-dev-master-encryption-key-2026').digest();
}

function encryptSecret(plainText) {
  if (!plainText) return '';
  const iv = crypto.randomBytes(16);
  const key = resolveMasterKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const token = process.env.META_DEV_ACCESS_TOKEN;
  if (!token || token.trim() === '') {
    console.error('❌ Error: META_DEV_ACCESS_TOKEN is missing or empty in .env');
    process.exit(1);
  }

  console.log('1. Validating META_DEV_ACCESS_TOKEN against Meta Graph API...');
  const meRes = await httpsGet(`https://graph.facebook.com/v19.0/me?access_token=${encodeURIComponent(token)}`);
  
  if (meRes.status !== 200 || !meRes.body || !meRes.body.id) {
    console.error('❌ Meta Token Validation Failed:');
    if (meRes.body?.error) {
      console.error(`   Message: ${meRes.body.error.message}`);
      console.error(`   Code: ${meRes.body.error.code}, Subcode: ${meRes.body.error.error_subcode || 'none'}`);
    } else {
      console.error(`   HTTP ${meRes.status}: ${JSON.stringify(meRes.body)}`);
    }
    process.exit(1);
  }

  console.log(`✅ Token is VALID for User: ${meRes.body.name} (User ID: ${meRes.body.id})`);

  console.log('2. Querying authorized Facebook Pages...');
  const accountsRes = await httpsGet(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,category,access_token,tasks&access_token=${encodeURIComponent(token)}`);
  
  const pages = accountsRes.body?.data || [];
  console.log(`   Found ${pages.length} page(s).`);

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3308,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'socialforge_db'
  });

  const [brands] = await connection.execute("SELECT id, name, tenant_id FROM brands WHERE name LIKE '%HOASP%'");
  if (!brands.length) {
    console.error('❌ HOASP brand not found in database.');
    await connection.end();
    process.exit(1);
  }
  const brand = brands[0];
  console.log(`3. Target Brand: ${brand.name} (${brand.id})`);

  const encryptedUserToken = encryptSecret(token);
  const now = new Date();

  // Find or create meta_connections
  const [existingConns] = await connection.execute("SELECT id FROM meta_connections WHERE brand_id = ?", [brand.id]);
  let connId;
  if (existingConns.length > 0) {
    connId = existingConns[0].id;
    await connection.execute(
      "UPDATE meta_connections SET meta_user_id = ?, encrypted_user_access_token = ?, status = 'connected', updated_at = ? WHERE id = ?",
      [meRes.body.id, encryptedUserToken, now, connId]
    );
    console.log('✅ Updated existing MetaConnection in database.');
  } else {
    connId = crypto.randomUUID();
    await connection.execute(
      "INSERT INTO meta_connections (id, tenant_id, brand_id, provider, meta_user_id, encrypted_user_access_token, status, require_approval_before_publish, metadata, created_at, updated_at) VALUES (?, ?, ?, 'meta', ?, ?, 'connected', 1, '{}', ?, ?)",
      [connId, brand.tenant_id, brand.id, meRes.body.id, encryptedUserToken, now, now]
    );
    console.log('✅ Created new MetaConnection in database.');
  }

  // Sync discovered pages
  for (const page of pages) {
    const encryptedPageToken = page.access_token ? encryptSecret(page.access_token) : encryptedUserToken;
    const [existingPages] = await connection.execute(
      "SELECT id FROM meta_facebook_pages WHERE connection_id = ? AND page_id = ?",
      [connId, page.id]
    );

    if (existingPages.length > 0) {
      await connection.execute(
        "UPDATE meta_facebook_pages SET page_name = ?, access_token_encrypted = ?, is_selected = ?, updated_at = ? WHERE id = ?",
        [page.name, encryptedPageToken, page.name.includes('HOASP') ? 1 : 0, now, existingPages[0].id]
      );
    } else {
      const pageDbId = crypto.randomUUID();
      await connection.execute(
        "INSERT INTO meta_facebook_pages (id, connection_id, page_id, page_name, access_token_encrypted, is_selected, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [pageDbId, connId, page.id, page.name, encryptedPageToken, page.name.includes('HOASP') ? 1 : 0, now, now]
      );
    }

    // Sync to social_accounts
    const [existingSa] = await connection.execute(
      "SELECT id FROM social_accounts WHERE brand_id = ? AND platform = 'FACEBOOK'",
      [brand.id]
    );

    if (existingSa.length > 0) {
      await connection.execute(
        "UPDATE social_accounts SET account_name = ?, account_id = ?, access_token_encrypted = ?, status = 'connected', is_active = 1, updated_at = ? WHERE id = ?",
        [page.name, page.id, encryptedPageToken, now, existingSa[0].id]
      );
      console.log(`✅ Synced Facebook SocialAccount for "${page.name}" (${page.id}).`);
    } else {
      const saId = crypto.randomUUID();
      await connection.execute(
        "INSERT INTO social_accounts (id, brand_id, platform, account_name, account_id, access_token_encrypted, status, is_active, created_at, updated_at) VALUES (?, ?, 'FACEBOOK', ?, ?, ?, 'connected', 1, ?, ?)",
        [saId, brand.id, page.name, page.id, encryptedPageToken, now, now]
      );
      console.log(`✅ Created Facebook SocialAccount for "${page.name}" (${page.id}).`);
    }
  }

  await connection.end();
  console.log('🎉 Re-authorization from .env complete! You are ready to publish live now.');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
