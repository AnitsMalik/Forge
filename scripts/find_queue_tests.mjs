import fs from 'fs';
function findTests(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files = [];
  for (const entry of entries) {
    const full = dir + '/' + entry.name;
    if (entry.isDirectory()) {
      files = files.concat(findTests(full));
    } else if (entry.name.includes('publish') || entry.name.includes('queue') || entry.name.includes('post') || entry.name.includes('calendar')) {
      files.push(full);
    }
  }
  return files;
}

console.log('API tests:', findTests('apps/api/test'));
console.log('Scripts:', findTests('scripts'));

