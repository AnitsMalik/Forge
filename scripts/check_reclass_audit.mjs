import { db } from '../apps/api/dist/db/connection.js';

async function main() {
  const reclassLogs = await db('publishing_audit_logs')
    .where('action', 'like', '%reclass%')
    .orWhere('action', 'like', '%sandbox%')
    .orWhere('action', 'like', '%integrity%')
    .select('*');

  console.log('Reclassification audit records count:', reclassLogs.length);
  if (reclassLogs.length > 0) {
    console.log('Sample reclass logs:', reclassLogs.slice(0, 5));
  } else {
    console.log('No reclassification audit records found yet.');
  }

  // Also check all distinct actions in publishing_audit_logs
  const distinctActions = await db('publishing_audit_logs').distinct('action');
  console.log('Distinct actions in publishing_audit_logs:', distinctActions.map(a => a.action));

  await db.destroy();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
