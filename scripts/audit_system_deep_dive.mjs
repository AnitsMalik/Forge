import { db } from '../apps/api/dist/db/connection.js';
import fs from 'fs';
import path from 'path';

async function runAudit() {
  console.log('Starting Deep Architectural Audit...');

  // 1. Check Database connection & list all tables
  const [tableRows] = await db.raw('SHOW TABLES');
  const tableNames = tableRows.map(r => Object.values(r)[0]).filter(n => !n.startsWith('knex_'));

  console.log(`Total Application Tables Found: ${tableNames.length}`);

  const tableStats = {};
  for (const name of tableNames) {
    try {
      const [{ count }] = await db(name).count('* as count');
      tableStats[name] = Number(count);
    } catch (e) {
      tableStats[name] = -1;
    }
  }

  // 2. Count routes across all route files
  const routesDir = path.resolve('apps/api/src/routes');
  const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

  const routeDetails = [];
  for (const rf of routeFiles) {
    const content = fs.readFileSync(path.join(routesDir, rf), 'utf8');
    const matches = content.match(/\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];
    routeDetails.push({
      file: rf,
      endpointsCount: matches.length,
      sampleEndpoints: matches.slice(0, 3).map(m => m.trim()),
    });
  }

  // 3. Count controllers and methods
  const controllersDir = path.resolve('apps/api/src/controllers');
  const controllerFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

  // 4. Inspect frontend tabs and pages
  const pagesDir = path.resolve('apps/web/src/pages');
  const pageDirs = fs.readdirSync(pagesDir).filter(f => fs.statSync(path.join(pagesDir, f)).isDirectory());

  // 5. Inspect API client in frontend
  const apiClientPath = path.resolve('apps/web/src/services/api.ts');
  const apiClientContent = fs.readFileSync(apiClientPath, 'utf8');
  const apiNamespaces = [];
  const namespaceRegex = /(\w+):\s*\{/g;
  let match;
  while ((match = namespaceRegex.exec(apiClientContent)) !== null) {
    apiNamespaces.push(match[1]);
  }

  // Write JSON output
  const result = {
    totalTables: tableNames.length,
    tableStats,
    totalRouteFiles: routeFiles.length,
    totalEndpointsAcrossFiles: routeDetails.reduce((acc, r) => acc + r.endpointsCount, 0),
    routeDetails,
    controllerFilesCount: controllerFiles.length,
    pageDirs,
    apiNamespaces: [...new Set(apiNamespaces)],
  };

  fs.writeFileSync('scripts/audit_deep_dive_output.json', JSON.stringify(result, null, 2));
  console.log('Audit scan completed and written to scripts/audit_deep_dive_output.json');
  await db.destroy();
}

runAudit().catch(err => {
  console.error('Audit script failed:', err);
  process.exit(1);
});
