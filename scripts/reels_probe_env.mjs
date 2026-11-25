import { createRequire } from 'module';
import { spawnSync } from 'child_process';
import fs from 'fs';
const require = createRequire(import.meta.url);

let ff;
try { ff = require('../apps/api/node_modules/@ffmpeg-installer/ffmpeg'); } catch { ff = require('@ffmpeg-installer/ffmpeg'); }
console.log('ffmpeg path:', ff.path);
const ver = spawnSync(ff.path, ['-version']).stdout.toString().split('\n')[0];
console.log(ver);
const filters = spawnSync(ff.path, ['-hide_banner', '-filters']).stdout.toString();
for (const f of ['ass', 'subtitles', 'drawtext', 'xfade', 'zoompan', 'sidechaincompress', 'gblur', 'acrossfade', 'aevalsrc', 'anoisesrc', 'gradients', 'overlay', 'concat']) {
  console.log(`  filter ${f}:`, new RegExp(`\\s${f}\\s`).test(filters));
}
const enc = spawnSync(ff.path, ['-hide_banner', '-encoders']).stdout.toString();
console.log('  libx264:', /libx264/.test(enc), ' aac:', /\saac\s/.test(enc));

for (const p of ['apps/api/.env', '.env']) {
  if (!fs.existsSync(p)) continue;
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  for (const l of lines) {
    if (/OPENAI|GEMINI|GOOGLE_AI|GOOGLE_API|ANTHROPIC|ELEVEN|PEXELS|PIXABAY|TTS|AI_PROVIDER|UNSPLASH|REPLICATE|STABILITY/i.test(l)) {
      const [k, ...v] = l.split('=');
      console.log(`${p}: ${k}=${v.join('=').trim() ? '<set>' : '<empty>'}`);
    }
  }
}

