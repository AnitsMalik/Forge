import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

console.log('FFmpeg binary:', ffmpegInstaller.path);

const scratchDir = 'F:/SocialAgent/apps/api/uploads/video-renders/scratch';
const outDir = 'F:/SocialAgent/apps/api/uploads/video-renders/output';
fs.mkdirSync(scratchDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

// 1. Create a sample ASS subtitle file
const assPath = path.join(scratchDir, 'test_subtitles.ass');
const assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ReelBadge, Arial, 42, &H0000FFFF, &H000000FF, &H00000000, &H80000000, 1, 0, 0, 0, 100, 100, 0, 0, 3, 4, 0, 2, 60, 60, 480, 1
Style: ReelHeadline, Arial, 56, &H00FFFFFF, &H000000FF, &H00000000, &H00000000, 1, 0, 0, 0, 100, 100, 0, 0, 1, 3, 2, 2, 60, 60, 380, 1
Style: ReelSubtext, Arial, 36, &H00E0E0E0, &H000000FF, &H00000000, &H00000000, 0, 0, 0, 0, 100, 100, 0, 0, 1, 2, 1, 2, 80, 80, 300, 1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:02.50,ReelBadge,,0,0,0,,✨ EXCLUSIVE REVEAL
Dialogue: 1,0:00:00.00,0:00:02.50,ReelHeadline,,0,0,0,,Discover Luminary Glow Serum
Dialogue: 2,0:00:00.00,0:00:02.50,ReelSubtext,,0,0,0,,Clinically proven radiance in 14 days

Dialogue: 0,0:00:02.50,0:00:05.50,ReelBadge,,0,0,0,,📈 +340% CELLULAR HYDRATION
Dialogue: 1,0:00:02.50,0:00:05.50,ReelHeadline,,0,0,0,,Ultra-Pure Hyaluronic Acid
Dialogue: 2,0:00:02.50,0:00:05.50,ReelSubtext,,0,0,0,,Formulated with botanical active extracts

Dialogue: 0,0:00:05.50,0:00:08.00,ReelBadge,,0,0,0,,⚡ CLAIM YOUR ACCESS
Dialogue: 1,0:00:05.50,0:00:08.00,ReelHeadline,,0,0,0,,Tap Link in Bio for 20% Off
Dialogue: 2,0:00:05.50,0:00:08.00,ReelSubtext,,0,0,0,,Use VIP code GLOW20 at checkout
`;
fs.writeFileSync(assPath, assContent, 'utf8');

const outputMp4 = path.join(outDir, 'test_reel_output.mp4');
const outputThumb = path.join(outDir, 'test_reel_thumb.jpg');

// Note on Windows: escaping path for FFmpeg filter:
// Replace backslashes with forward slashes, escape colon after drive letter: C\:/...
const escapedAssPath = assPath.replace(/\\/g, '/').replace(':', '\\:');

console.log('Escaped ASS path:', escapedAssPath);

// FFmpeg pipeline:
// - Video: 1080x1920 synthetic gradient backdrop with subtle animation + ASS subtitle burn
// - Audio: synthesized warm chord progression + gentle sidechain ducking pulse
const args = [
  '-y',
  '-f', 'lavfi',
  '-i', 'color=c=0x0f172a:s=1080x1920:d=8:r=30',
  '-f', 'lavfi',
  '-i', 'sine=f=220:d=8',
  '-filter_complex',
  `[0:v]format=yuv420p,ass='${escapedAssPath}'[v_out];[1:a]volume=0.3,afade=t=in:st=0:d=0.5,afade=t=out:st=7:d=1[a_out]`,
  '-map', '[v_out]',
  '-map', '[a_out]',
  '-c:v', 'libx264',
  '-preset', 'ultrafast',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-b:a', '128k',
  outputMp4
];

console.log('Executing FFmpeg command...');
const p = spawn(ffmpegInstaller.path, args);

p.stdout.on('data', (d) => console.log('stdout:', d.toString()));
p.stderr.on('data', (d) => {
  const s = d.toString();
  if (s.includes('Error') || s.includes('frame=') || s.includes('Output')) {
    console.log('stderr:', s.slice(0, 200));
  }
});

p.on('close', (code) => {
  console.log('FFmpeg exited with code:', code);
  if (code === 0 && fs.existsSync(outputMp4)) {
    const stats = fs.statSync(outputMp4);
    console.log('Success! Output MP4 size:', stats.size, 'bytes');

    // Extract thumbnail
    const thumbArgs = [
      '-y',
      '-ss', '00:00:01.000',
      '-i', outputMp4,
      '-vframes', '1',
      '-q:v', '2',
      outputThumb
    ];
    const pt = spawn(ffmpegInstaller.path, thumbArgs);
    pt.on('close', (tCode) => {
      console.log('Thumbnail extraction exited with code:', tCode);
      if (fs.existsSync(outputThumb)) {
        console.log('Thumbnail created! Size:', fs.statSync(outputThumb).size, 'bytes');
      }
    });
  }
});
