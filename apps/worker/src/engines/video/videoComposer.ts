import { spawn, spawnSync } from 'child_process';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import type { ReelRenderRequest, RenderedVideoResult } from '@socialforge/shared';

export class VideoComposer {
  private static ffmpegPath: string | null = null;
  private static outDir = path.resolve(process.cwd(), '../api/uploads/video-renders/output');
  private static scratchDir = path.resolve(process.cwd(), '../api/uploads/video-renders/scratch');

  static {
    try {
      fs.mkdirSync(this.outDir, { recursive: true });
      fs.mkdirSync(this.scratchDir, { recursive: true });
    } catch {}
  }

  public static resolveFfmpeg(): string {
    if (this.ffmpegPath) return this.ffmpegPath;
    if (ffmpegInstaller && ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) {
      this.ffmpegPath = ffmpegInstaller.path;
      return this.ffmpegPath;
    }
    try {
      const res = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
      if (res.status === 0) {
        this.ffmpegPath = 'ffmpeg';
        return this.ffmpegPath;
      }
    } catch {}
    throw new Error('FFmpeg binary not found in worker environment');
  }

  public static async renderReel(req: ReelRenderRequest, brandInfo?: { id: string; name?: string; primaryColor?: string }): Promise<RenderedVideoResult> {
    const ffmpegBinary = this.resolveFfmpeg();
    const assetId = crypto.randomUUID();
    const duration = req.durationSec || 8;
    const fileName = `worker-reel-${assetId.substring(0, 8)}.mp4`;
    const thumbName = `worker-thumb-${assetId.substring(0, 8)}.jpg`;
    const outMp4 = path.join(this.outDir, fileName);
    const outThumb = path.join(this.outDir, thumbName);

    // Build subtitle file if scenes exist
    let assFile: string | null = null;
    if (req.burnSubtitles !== false && req.scenes && req.scenes.length > 0) {
      assFile = path.join(this.scratchDir, `${assetId}-worker.ass`);
      let dialogue = '';
      let running = 0;
      req.scenes.forEach((s) => {
        const d = s.durationSec || 2.5;
        const st = running;
        const et = running + d;
        running = et;
        const pad = (n: number) => String(n).padStart(2, '0');
        const toAss = (sec: number) => `0:${pad(Math.floor(sec / 60))}:${pad(Math.floor(sec % 60))}.00`;
        if (s.badge) dialogue += `Dialogue: 0,${toAss(st)},${toAss(et)},ReelBadge,,0,0,0,,${s.badge}\n`;
        dialogue += `Dialogue: 1,${toAss(st)},${toAss(et)},ReelHeadline,,0,0,0,,${s.headline.replace(/\r?\n/g, '\\N')}\n`;
        if (s.subtext) dialogue += `Dialogue: 2,${toAss(st)},${toAss(et)},ReelSubtext,,0,0,0,,${s.subtext.replace(/\r?\n/g, '\\N')}\n`;
      });

      const assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ReelBadge, Arial, 38, &H0000FFFF, &H000000FF, &H00000000, &H90000000, 1, 0, 0, 0, 100, 100, 1, 0, 3, 3, 0, 2, 80, 80, 520, 1
Style: ReelHeadline, Arial, 54, &H00FFFFFF, &H000000FF, &H00000000, &H00000000, 1, 0, 0, 0, 100, 100, 0, 0, 1, 4, 3, 2, 70, 70, 410, 1
Style: ReelSubtext, Arial, 34, &H00E0E0E0, &H000000FF, &H00000000, &H00000000, 0, 0, 0, 0, 100, 100, 0, 0, 1, 3, 2, 2, 90, 90, 330, 1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogue}`;
      fs.writeFileSync(assFile, assContent, 'utf8');
    }

    const args = ['-y'];
    let vFilter = '';

    if (req.bgVideoUrl && req.bgVideoUrl.startsWith('http')) {
      args.push('-i', req.bgVideoUrl);
      vFilter = `[0:v]split=2[bg_in][fg_in];[bg_in]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5[bg_blurred];[fg_in]scale=1080:1920:force_original_aspect_ratio=decrease[fg_scaled];[bg_blurred][fg_scaled]overlay=(W-w)/2:(H-h)/2,trim=duration=${duration},setpts=PTS-STARTPTS[base_v]`;
    } else {
      args.push('-f', 'lavfi', '-i', `color=c=0x0b0f19:s=1080x1920:d=${duration}:r=30`);
      vFilter = `[0:v]format=yuv420p[base_v]`;
    }

    args.push('-f', 'lavfi', '-i', `sine=f=220:d=${duration}`);

    let filterComplex = '';
    if (assFile) {
      const esc = assFile.replace(/\\/g, '/').replace(':', '\\:');
      filterComplex = `${vFilter};[base_v]ass='${esc}'[v_out];[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=0.35,afade=t=in:st=0:d=0.5,afade=t=out:st=${duration - 1}:d=1[a_out]`;
    } else {
      filterComplex = `${vFilter};[base_v]null[v_out];[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=0.35,afade=t=in:st=0:d=0.5,afade=t=out:st=${duration - 1}:d=1[a_out]`;
    }

    args.push('-filter_complex', filterComplex);
    args.push('-map', '[v_out]', '-map', '[a_out]', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-t', String(duration), outMp4);

    await new Promise<void>((resolve, reject) => {
      const p = spawn(ffmpegBinary, args);
      p.on('close', (c) => (c === 0 ? resolve() : reject(new Error(`Worker FFmpeg failed with exit code ${c}`))));
      p.on('error', reject);
    });

    // Extract thumb
    await new Promise<void>((resolve) => {
      const pt = spawn(ffmpegBinary, ['-y', '-ss', '00:00:01.000', '-i', outMp4, '-vframes', '1', outThumb]);
      pt.on('close', () => resolve());
    });

    if (assFile && fs.existsSync(assFile)) {
      try { fs.unlinkSync(assFile); } catch {}
    }

    const sz = fs.existsSync(outMp4) ? fs.statSync(outMp4).size : 2400000;

    return {
      assetId,
      fileName,
      publicUrl: `http://localhost:4000/uploads/video-renders/output/${fileName}`,
      thumbnailUrl: `http://localhost:4000/uploads/video-renders/output/${thumbName}`,
      durationSec: duration,
      width: 1080,
      height: 1920,
      fileSizeBytes: sz,
      codec: 'h264/aac',
      engineUsed: 'native_ffmpeg',
      filtersApplied: ['9:16 Aspect Normalization', 'Dynamic Subtitles', 'Audio Fade-in/out'],
    };
  }
}
