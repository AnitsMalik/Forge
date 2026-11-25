const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      results.push(...walk(full));
    } else if (f.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

const routes = walk('apps/api/src/routes');
console.log('Total route files found:', routes.length);

const gatedRoutes = [];
const nonGatedRoutes = [];

routes.forEach((file) => {
  const content = fs.readFileSync(file, 'utf8');
  const hasGuard =
    content.includes('planLimits') ||
    content.includes('requirePlanGuard') ||
    content.includes('enforceEntitlement') ||
    content.includes('requireEntitlement');
  if (hasGuard) {
    gatedRoutes.push(file);
  } else {
    nonGatedRoutes.push(file);
  }
});

console.log('\n--- GATED ROUTES (' + gatedRoutes.length + ') ---');
gatedRoutes.forEach((r) => console.log('  [GATED] ' + r));

console.log('\n--- NON-GATED ROUTES (' + nonGatedRoutes.length + ') ---');
nonGatedRoutes.forEach((r) => console.log('  [NON-GATED] ' + r));

