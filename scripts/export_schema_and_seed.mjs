import fs from 'node:fs';
import path from 'node:path';
import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  console.log('Generating complete production SQL dump...');
  const outputFile = path.resolve(process.cwd(), 'hoaspforge_production_database.sql');
  const writeStream = fs.createWriteStream(outputFile, { encoding: 'utf8' });

  writeStream.write('-- HoaspForge Production Database Dump\n');
  writeStream.write('-- Generated for Hostinger MySQL Deployment\n');
  writeStream.write('-- Compatibility: MySQL 8.x / MariaDB 10.x\n\n');
  writeStream.write('SET FOREIGN_KEY_CHECKS = 0;\n');
  writeStream.write("SET time_zone = '+00:00';\n");
  writeStream.write("SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';\n\n");

  const [tablesResult] = await db.raw('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
  const tableNames = tablesResult.map(row => Object.values(row)[0]);
  console.log(`Processing ${tableNames.length} tables...`);

  // Tables to export data from (users, tenants, brands, knex migrations, roles, settings, etc.)
  const dataTables = [
    'knex_migrations',
    'knex_migrations_lock',
    'users',
    'tenants',
    'tenant_users',
    'brands',
    'workspaces',
    'workspace_users',
    'posts',
    'post_variants',
    'publishing_jobs',
    'connected_accounts',
    'subscription_plans',
    'design_templates',
    'brand_brain_profiles',
    'brand_governance_settings'
  ];

  for (const table of tableNames) {
    // 1. DDL
    const [createResult] = await db.raw(`SHOW CREATE TABLE \`${table}\``);
    const createSql = createResult[0]['Create Table'];
    writeStream.write(`DROP TABLE IF EXISTS \`${table}\`;\n`);
    writeStream.write(`${createSql};\n\n`);

    // 2. Data
    if (dataTables.includes(table)) {
      const [rows] = await db.raw(`SELECT * FROM \`${table}\``);
      if (rows && rows.length > 0) {
        writeStream.write(`-- Data for table \`${table}\` (${rows.length} rows)\n`);
        for (const row of rows) {
          const keys = Object.keys(row).map(k => `\`${k}\``).join(', ');
          const values = Object.values(row).map(val => {
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 1 : 0;
            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
            const strVal = String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r');
            return `'${strVal}'`;
          }).join(', ');
          writeStream.write(`INSERT INTO \`${table}\` (${keys}) VALUES (${values});\n`);
        }
        writeStream.write('\n');
      }
    }
  }

  writeStream.write('SET FOREIGN_KEY_CHECKS = 1;\n');
  writeStream.end();

  console.log(`✓ Production SQL dump successfully written to: ${outputFile}`);
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
