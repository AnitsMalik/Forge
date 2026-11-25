import mysql from 'mysql2/promise';

async function main() {
  const c = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3308,
    user: 'root',
    password: 'root',
    database: 'socialforge_db'
  });

  const [users] = await c.execute("SELECT id, email, full_name, is_superadmin, is_active FROM users");
  console.log('Users in DB:');
  for (const u of users) {
    console.log(` - ${u.email} (${u.full_name}): is_superadmin=${u.is_superadmin}, is_active=${u.is_active}`);
  }

  await c.end();
}

main().catch(console.error);
