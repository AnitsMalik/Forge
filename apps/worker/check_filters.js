import { spawnSync } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

console.log('FFmpeg binary path:', ffmpegInstaller.path);
const res = spawnSync(ffmpegInstaller.path, ['-filters'], { encoding: 'utf-8' });
const lines = res.stdout.split('\n');
const matched = lines.filter(l => /subtitles|ass|drawtext|sidechain|boxblur|overlay/i.test(l));
console.log('Found filters:\n', matched.join('\n'));
