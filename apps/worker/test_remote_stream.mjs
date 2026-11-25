import { spawn } from 'child_process';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const bgUrl = 'https://assets.mixkit.co/videos/preview/mixkit-tree-branches-in-the-breeze-1188-large.mp4';
const duration = 5;
const videoFilterFragment = `[0:v]split=2[bg_in][fg_in];[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg_blurred];[fg_in]scale=1080:1920:force_original_aspect_ratio=decrease[fg_scaled];[bg_blurred][fg_scaled]overlay=(W-w)/2:(H-h)/2,trim=duration=${duration},setpts=PTS-STARTPTS[base_v];[base_v]null[v_out];[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=0.35,afade=t=in:st=0:d=0.5,afade=t=out:st=4:d=1[a_out]`;

const args = [
  '-y',
  '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  '-i', bgUrl,
  '-f', 'lavfi', '-i', `sine=f=220:d=${duration}`,
  '-filter_complex', videoFilterFragment,
  '-map', '[v_out]',
  '-map', '[a_out]',
  '-c:v', 'libx264',
  '-preset', 'ultrafast',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-t', String(duration),
  'F:/SocialAgent/apps/api/uploads/video-renders/output/test_remote_broll.mp4'
];

console.log('Testing remote video stream in FFmpeg...');
const p = spawn(ffmpegInstaller.path, args);
p.stderr.on('data', (d) => console.log('stderr:', d.toString()));
p.on('close', (c) => console.log('Exited with:', c));
