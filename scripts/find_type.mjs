import fs from 'fs';

const lines = fs.readFileSync('apps/web/src/services/api.ts', 'utf8').split('\n');
lines.forEach((l, i) => {
  if (l.includes('videos') || l.includes('storyboard')) console.log(i + 1, l);
});
