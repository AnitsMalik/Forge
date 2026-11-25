import fs from 'fs';
const src = fs.readFileSync('apps/web/src/components/ReelMotionStudioModal.tsx', 'utf8');
const lines = src.split('\n');
console.log('lines', lines.length);
// list api calls, state hooks, handlers
const pats = [/api\.[a-zA-Z]+\.[a-zA-Z]+/g];
const apis = new Set();
for (const l of lines) for (const m of l.matchAll(pats[0])) apis.add(m[0]);
console.log('API calls:', [...apis].join(', '));
lines.forEach((l, i) => {
  if (/^\s*const handle[A-Z]\w*\s*=/.test(l) || /^\s*(export )?(const|function) \w+.*=>\s*\{?$/.test(l) && /^\S|^  const/.test(l) || /interface \w+Props/.test(l)) console.log(i + 1, l.trim().slice(0, 120));
});

