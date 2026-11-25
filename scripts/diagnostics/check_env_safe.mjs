import fs from 'fs';
import path from 'path';

function checkEnv() {
  const envPaths = ['.env', 'apps/api/.env'];
  for (const ep of envPaths) {
    if (fs.existsSync(ep)) {
      console.log(`Checking ${ep}:`);
      const content = fs.readFileSync(ep, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          const hasVal = val.length > 0;
          const isPlaceholder = val.includes('your_') || val.includes('placeholder') || val.includes('simul') || val === 'xxx';
          console.log(`  ${key}: set=${hasVal}, len=${val.length}, isPlaceholder=${isPlaceholder}, prefix=${val.slice(0, 4)}...`);
        }
      }
    }
  }
}
checkEnv();
