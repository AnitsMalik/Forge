import fs from 'fs';
const lines = fs.readFileSync('apps/web/src/pages/SuperadminOperationsPage.tsx', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('worm_vault')) console.log(i + 1, l.trim());
});
