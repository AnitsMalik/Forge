import fs from 'fs';
const content = fs.readFileSync('apps/web/src/services/api.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (l.includes('copilot') || l.includes('Copilot')) {
    console.log(`${i+1}: ${l}`);
  }
});
