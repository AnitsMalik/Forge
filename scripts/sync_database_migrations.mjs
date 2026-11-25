import fs from 'fs';
import path from 'path';

const srcDir = 'apps/api/src/db/migrations';
const dstDir = 'packages/database/migrations';

const srcFiles = fs.readdirSync(srcDir);
let copied = 0;

for (const file of srcFiles) {
  const srcPath = path.join(srcDir, file);
  const dstPath = path.join(dstDir, file);
  if (!fs.existsSync(dstPath)) {
    fs.copyFileSync(srcPath, dstPath);
    copied++;
  }
}

const totalDst = fs.readdirSync(dstDir).length;
console.log(`Copied ${copied} new migration file(s). Total in ${dstDir}: ${totalDst}`);
