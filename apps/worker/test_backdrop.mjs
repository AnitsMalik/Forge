import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const scratchDir = 'F:/SocialAgent/apps/api/uploads/video-renders/scratch';
const outDir = 'F:/SocialAgent/apps/api/uploads/video-renders/output';
const outputMp4 = path.join(outDir, 'test_backdrop_output.mp4');
const outputThumb = path.join(outDir, 'test_backdrop_thumb.jpg');

// Simulate a 16:9 landscape video input (e.g. 1920x1080 test bars)
// and convert it to 9:16 (1080x1920) with blurred background backdrop!
const args = [
  '-y',
  '-f', 'lavfi',
  '-i', 'smptebars=s=1280x720:d=4:r=30',
  '-filter_complex',
  '[0:v]split=2[bg_in][fg_in];[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg_blurred];[fg_in]scale=1080:1920:force_original_aspect_ratio=decrease[fg_scaled];[bg_blurred][fg_scaled]overlay=(W-w)/2:(H-h)/2[base_video];[base_video]format=yuv420p[v_out]',
  '-map', '[v_out]',
  '-c:v', 'libx264',
  '-preset', 'ultrafast',
  '-pix_fmt', 'yuv420p',
  outputMp4
];

console.log('Testing Aspect Ratio Normalization with blurred backdrop...');
const p = spawn(ffmpegInstaller.path, args);

p.on('close', (code) => {
  console.log('Backdrop test exited with code:', code);
  if (code === 0 && fs.existsSync(outputMp4)) {
    console.log('Backdrop MP4 generated:', fs.statSync(outputMp4).size, 'bytes');

    // Extract thumb
    const pt = spawn(ffmpegInstaller.path, ['-y', '-ss', '00:00:01.000', '-i', outputMp4, '-vframes', '1', outputThumb]);
    pt.on('close', (tCode) => {
      console.log('Backdrop thumb extracted with code:', tCode);
    });
  }
});
