const fs = require('fs');
const path = require('path');

function walk(d) {
  let r = [];
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) r.push(...walk(p));
    else if (f.endsWith('.ts')) r.push(p);
  }
  return r;
}

const terms = ['client_approvals', 'submitApproval', 'whatsapp', 'email', 'scim', 'connections'];
terms.forEach(term => {
  console.log(`\n=== Matches for '${term}' ===`);
  walk('apps/api/src').forEach(f => {
    const c = fs.readFileSync(f, 'utf8');
    if (c.toLowerCase().includes(term.toLowerCase())) {
      console.log('  ', f);
    }
  });
});

