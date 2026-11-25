import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  const [colsPublishingAudit] = await db.raw('DESCRIBE publishing_audit_logs');
  console.log('publishing_audit_logs columns:', colsPublishingAudit.map(c => `${c.Field} (${c.Type})`));

  const [colsPublishLogs] = await db.raw('DESCRIBE publish_logs');
  console.log('publish_logs columns:', colsPublishLogs.map(c => `${c.Field} (${c.Type})`));

  const auditRows = await db('publishing_audit_logs').select('*').limit(10);
  console.log('publishing_audit_logs count:', (await db('publishing_audit_logs').count('* as count'))[0].count);
  console.log('Sample audit rows:', auditRows);

  await db.destroy();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
