import https from 'https';
import { spawnSync } from 'child_process';

function head(url) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, (res) => {
      resolve(`${res.statusCode} ${res.headers['content-type'] || ''} ${res.headers.location ? '-> ' + res.headers.location.slice(0, 80) : ''}`);
      res.destroy();
    });
    req.on('error', (e) => resolve('ERR ' + e.message));
    req.on('timeout', () => { req.destroy(); resolve('TIMEOUT'); });
  });
}

const urls = [
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1080&q=80',
  'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4',
  'https://picsum.photos/1080/1920',
  'https://generativelanguage.googleapis.com/',
  'https://api.openai.com/v1/models',
];
for (const u of urls) console.log(u.slice(0, 70), '=>', await head(u));

// Windows SAPI voices
const ps = spawnSync('powershell', ['-NoProfile', '-Command',
  "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name + ' | ' + $_.VoiceInfo.Culture + ' | ' + $_.VoiceInfo.Gender }"], { encoding: 'utf8' });
console.log('SAPI voices:\n' + (ps.stdout || ps.stderr));

