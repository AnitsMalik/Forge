import fs from 'fs';
function searchDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = dir + '/' + e.name;
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== 'dist') searchDir(full);
    } else if (e.name.endsWith('.ts') || e.name.endsWith('.js')) {
      const code = fs.readFileSync(full, 'utf8');
      if (code.includes('copilot') || code.includes('Copilot')) {
        console.log(full);
      }
    }
  }
}
searchDir('apps/api/src');

