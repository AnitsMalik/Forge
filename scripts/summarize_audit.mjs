import fs from 'fs';

const d = JSON.parse(fs.readFileSync('scripts/audit_deep_dive_output.json', 'utf8'));
console.log('--- SYSTEM OVERVIEW ---');
console.log('Tables:', d.totalTables);
console.log('Route Files:', d.totalRouteFiles);
console.log('Total Endpoints:', d.totalEndpointsAcrossFiles);
console.log('Controllers:', d.controllerFilesCount);
console.log('Frontend Pages:', d.pageDirs);
console.log('\n--- POPULATED TABLES ---');
const populated = Object.entries(d.tableStats).filter(([k, v]) => v > 0);
for (const [t, c] of populated) {
  console.log(`  ${t.padEnd(45)}: ${c} rows`);
}
console.log('\nTotal Populated Tables:', populated.length, 'out of', d.totalTables);

