import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const scratchDir = 'F:/SocialAgent/apps/api/uploads/video-renders/scratch';
const outDir = 'F:/SocialAgent/apps/api/uploads/video-renders/output';
const outputMp4 = path.join(outDir, 'test_ducking_output.mp4');

// Stream 0: Sine wave background music (e.g. constant 440Hz tone)
// Stream 1: Voiceover tone pulse at 880Hz active from t=2s to t=5s
// Filter: sidechaincompress ducks Stream 0 when Stream 1 is loud
const args = [
  '-y',
  '-f', 'lavfi',
  '-i', 'sine=f=440:d=6',
  '-f', 'lavfi',
  '-i', 'aevalsrc=sin(2*PI*880*t)*between(t\\,2\\,5):d=6',
  '-filter_complex',
  '[0:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=0.5[bg];[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=0.8,asplit=2[vox1][vox2];[bg][vox1]sidechaincompress=threshold=0.1:ratio=6:attack=50:release=300[ducked_bg];[ducked_bg][vox2]amix=inputs=2:duration=longest[a_out]',
  '-map', '[a_out]',
  '-c:a', 'aac',
  outputMp4
];

console.log('Testing Sidechain Audio Ducking in FFmpeg...');
const p = spawn(ffmpegInstaller.path, args);
p.stderr.on('data', (d) => console.log('stderr:', d.toString()));


p.on('close', (code) => {
  console.log('Ducking test exited with code:', code);
  if (code === 0 && fs.existsSync(outputMp4)) {
    console.log('Ducked audio MP4 size:', fs.statSync(outputMp4).size, 'bytes');
  }
});
