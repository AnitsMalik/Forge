import { spawn, spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import type {
  MotionCaptionStyle,
  ReelRenderRequest,
  ReelScene,
  RenderedVideoResult,
  VideoRenderJob,
} from '@socialforge/shared';
import { db } from '../db/connection.js';
import { TtsService } from './ttsService.js';

// In-memory fallback map for quick access
const videoJobs = new Map<string, VideoRenderJob>();

export class VideoEngine {
  private static ffmpegBinaryPath: string | null = null;

  private static getUploadsBase(): string {
    const rootUploads = path.resolve(process.cwd(), '../../uploads');
    if (fs.existsSync(rootUploads)) return rootUploads;
    const parentUploads = path.resolve(process.cwd(), '../uploads');
    if (fs.existsSync(parentUploads)) return parentUploads;
    return path.resolve(process.cwd(), 'uploads');
  }

  private static uploadsBaseDir = VideoEngine.getUploadsBase();
  private static outputDir = path.resolve(VideoEngine.getUploadsBase(), 'video-renders/output');
  private static scratchDir = path.resolve(VideoEngine.getUploadsBase(), 'video-renders/scratch');

  static {
    // Ensure base directories exist
    try {
      fs.mkdirSync(this.outputDir, { recursive: true });
      fs.mkdirSync(this.scratchDir, { recursive: true });
    } catch (err) {
      console.error('[VideoEngine] Failed to create directories:', err);
    }
  }

  // Resolve working FFmpeg binary
  public static getFfmpegPath(): string {
    if (this.ffmpegBinaryPath) return this.ffmpegBinaryPath;

    // Check installer path
    if (ffmpegInstaller && ffmpegInstaller.path && fs.existsSync(ffmpegInstaller.path)) {
      try {
        const test = spawnSync(ffmpegInstaller.path, ['-version']);
        if (test.status === 0) {
          this.ffmpegBinaryPath = ffmpegInstaller.path;
          console.log(`[VideoEngine] Using FFmpeg binary at: ${this.ffmpegBinaryPath}`);
          return this.ffmpegBinaryPath;
        }
      } catch {}
    }

    // Fallback to system PATH
    try {
      const sysTest = spawnSync('ffmpeg', ['-version']);
      if (sysTest.status === 0) {
        this.ffmpegBinaryPath = 'ffmpeg';
        console.log('[VideoEngine] Using system FFmpeg binary from PATH');
        return this.ffmpegBinaryPath;
      }
    } catch {}

    throw new Error('FFmpeg binary could not be resolved on this system');
  }

  // Fast download helper with standard User-Agent and timeout
  private static async downloadFile(url: string, destPath: string, timeoutMs = 8000, maxRedirects = 3): Promise<boolean> {
    if (maxRedirects < 0) return false;
    return new Promise((resolve) => {
      try {
        const parsed = new URL(url);
        const getter = parsed.protocol === 'https:' ? https.get : http.get;
        const req = getter(
          url,
          {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
              Accept: '*/*',
            },
            timeout: timeoutMs,
          },
          (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              const redirectUrl = new URL(res.headers.location, url).toString();
              return resolve(this.downloadFile(redirectUrl, destPath, timeoutMs, maxRedirects - 1));
            }
            if (res.statusCode !== 200) {
              return resolve(false);
            }
            const fileStream = fs.createWriteStream(destPath);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
              fileStream.close();
              resolve(true);
            });
            fileStream.on('error', () => resolve(false));
          }
        );
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
      } catch {
        resolve(false);
      }
    });
  }

  // Robust video source resolution (local file, uploaded asset, or remote download with synthetic fallback)
  private static async resolveVideoInput(
    rawUrl?: string,
    scratchPrefix?: string
  ): Promise<{ path: string; isLocal: boolean; isSynthetic: boolean }> {
    if (!rawUrl || typeof rawUrl !== 'string') {
      return { path: '', isLocal: false, isSynthetic: true };
    }

    // 1. Check if direct local filesystem path
    if (fs.existsSync(rawUrl)) {
      return { path: rawUrl, isLocal: true, isSynthetic: false };
    }

    // 2. Check if local uploads URL
    if (rawUrl.includes('/uploads/')) {
      const rel = rawUrl.substring(rawUrl.indexOf('/uploads/') + '/uploads/'.length);
      const localUpload = path.join(this.uploadsBaseDir, rel);
      if (fs.existsSync(localUpload)) {
        return { path: localUpload, isLocal: true, isSynthetic: false };
      }
    }

    // 3. Attempt download of remote video
    if (rawUrl.startsWith('http')) {
      try {
        const scratchTarget = path.join(this.scratchDir, `${scratchPrefix || 'temp'}-input.mp4`);
        const ok = await this.downloadFile(rawUrl, scratchTarget, 10000);
        if (ok && fs.existsSync(scratchTarget) && fs.statSync(scratchTarget).size > 1000) {
          return { path: scratchTarget, isLocal: true, isSynthetic: false };
        }
      } catch (err) {
        console.warn(`[VideoEngine] Could not cache remote video:`, err);
      }
    }

    // Fallback to high-aesthetic synthetic studio backdrop
    return { path: '', isLocal: false, isSynthetic: true };
  }

  // Format seconds to ASS timestamp 0:00:00.00
  private static formatAssTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centis = Math.floor((seconds % 1) * 100);

    const pad = (n: number, z = 2) => String(n).padStart(z, '0');
    return `${hrs}:${pad(mins)}:${pad(secs)}.${pad(centis)}`;
  }

  // Generate ASS (Advanced SubStation Alpha) subtitle file with kinetic animation support
  public static generateAssFile(
    scenes: ReelScene[],
    scratchFilePrefix: string,
    options?: {
      primaryColorHex?: string;
      brandName?: string;
      outroHeadline?: string;
      outroSubtext?: string;
      includeOutro?: boolean;
      motionStyle?: MotionCaptionStyle;
      width?: number;
      height?: number;
      aspectRatio?: '9:16' | '16:9' | '1:1';
    }
  ): string {
    const assPath = path.join(this.scratchDir, `${scratchFilePrefix}-subtitles.ass`);
    const width = options?.width || 1080;
    const height = options?.height || 1920;
    const isWidescreen = options?.aspectRatio === '16:9';
    const isSquare = options?.aspectRatio === '1:1';

    const primaryColor = options?.primaryColorHex ? options.primaryColorHex.replace('#', '') : '38BDF8';
    // ASS BGR format: &H00BBGGRR
    const bgr = primaryColor.length === 6
      ? `&H00${primaryColor.substring(4, 6)}${primaryColor.substring(2, 4)}${primaryColor.substring(0, 2)}`
      : '&H00FFFFFF';

    const defaultStyle = options?.motionStyle || 'kinetic_pop';
    let dialogueLines = '';
    let runningTime = 0;

    scenes.forEach((scene) => {
      const duration = Math.max(scene.durationSec || 2.5, 1.5);
      const startTime = runningTime;
      const endTime = runningTime + duration;
      runningTime = endTime;

      const startAss = this.formatAssTime(startTime);
      const endAss = this.formatAssTime(endTime);
      const anim = scene.animation || defaultStyle;

      // Dynamic animation tags per preset
      let animTag = '';
      if (anim === 'kinetic_pop') {
        animTag = '{\\t(0,220,\\fscx115\\fscy115)\\t(220,400,\\fscx100\\fscy100)}';
      } else if (anim === 'scale') {
        animTag = '{\\t(0,350,\\fscx112\\fscy112)}';
      } else if (anim === 'cinematic_fade') {
        animTag = '{\\fad(350,250)}';
      } else if (anim === 'slide') {
        animTag = '{\\fad(250,150)}';
      } else if (anim === 'karaoke_highlight') {
        animTag = `{\\c&H00FFFFFF&\\t(0,300,\\c${bgr}&)}`;
      }

      if (scene.badge) {
        dialogueLines += `Dialogue: 0,${startAss},${endAss},ReelBadge,,0,0,0,,${animTag}${scene.badge.replace(/\r?\n/g, ' ')}\n`;
      }
      dialogueLines += `Dialogue: 1,${startAss},${endAss},ReelHeadline,,0,0,0,,${animTag}${scene.headline.replace(/\r?\n/g, '\\N')}\n`;
      if (scene.subtext) {
        dialogueLines += `Dialogue: 2,${startAss},${endAss},ReelSubtext,,0,0,0,,${scene.subtext.replace(/\r?\n/g, '\\N')}\n`;
      }
    });

    // Optional outro scene
    if (options?.includeOutro && (options.outroHeadline || options.brandName)) {
      const outroStart = runningTime;
      const outroEnd = runningTime + 2.5;
      const startAss = this.formatAssTime(outroStart);
      const endAss = this.formatAssTime(outroEnd);

      dialogueLines += `Dialogue: 0,${startAss},${endAss},ReelBadge,,0,0,0,,✦ CONNECT WITH US\n`;
      dialogueLines += `Dialogue: 1,${startAss},${endAss},ReelHeadline,,0,0,0,,${options.outroHeadline || options.brandName}\n`;
      if (options.outroSubtext) {
        dialogueLines += `Dialogue: 2,${startAss},${endAss},ReelSubtext,,0,0,0,,${options.outroSubtext}\n`;
      }
    }

    // Font size and margin calculations based on aspect ratio & resolution
    let badgeFontSize = 38;
    let headlineFontSize = 54;
    let subtextFontSize = 34;
    let badgeMarginV = 520;
    let headlineMarginV = 410;
    let subtextMarginV = 330;

    if (isWidescreen) {
      badgeFontSize = Math.max(Math.round(height * 0.040), 22);
      headlineFontSize = Math.max(Math.round(height * 0.058), 30);
      subtextFontSize = Math.max(Math.round(height * 0.034), 20);
      badgeMarginV = Math.round(height * 0.32);
      headlineMarginV = Math.round(height * 0.22);
      subtextMarginV = Math.round(height * 0.13);
    } else if (isSquare) {
      badgeFontSize = Math.max(Math.round(height * 0.038), 22);
      headlineFontSize = Math.max(Math.round(height * 0.052), 28);
      subtextFontSize = Math.max(Math.round(height * 0.032), 18);
      badgeMarginV = Math.round(height * 0.40);
      headlineMarginV = Math.round(height * 0.30);
      subtextMarginV = Math.round(height * 0.20);
    } else {
      // 9:16
      const scaleFactor = height / 1920;
      badgeFontSize = Math.round(38 * scaleFactor);
      headlineFontSize = Math.round(54 * scaleFactor);
      subtextFontSize = Math.round(34 * scaleFactor);
      badgeMarginV = Math.round(520 * scaleFactor);
      headlineMarginV = Math.round(410 * scaleFactor);
      subtextMarginV = Math.round(330 * scaleFactor);
    }

    const assContent = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ReelBadge, Arial, ${badgeFontSize}, &H0000FFFF, &H000000FF, &H00000000, &H90000000, 1, 0, 0, 0, 100, 100, 1, 0, 3, 3, 0, 2, 80, 80, ${badgeMarginV}, 1
Style: ReelHeadline, Arial, ${headlineFontSize}, &H00FFFFFF, &H000000FF, &H00000000, &H00000000, 1, 0, 0, 0, 100, 100, 0, 0, 1, 4, 3, 2, 70, 70, ${headlineMarginV}, 1
Style: ReelSubtext, Arial, ${subtextFontSize}, ${bgr}, &H000000FF, &H00000000, &H00000000, 0, 0, 0, 0, 100, 100, 0, 0, 1, 3, 2, 2, 90, 90, ${subtextMarginV}, 1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${dialogueLines}`;

    fs.writeFileSync(assPath, assContent, 'utf8');
    return assPath;
  }

  // Get active job by ID (queries DB first with in-memory fallback)
  public static async getJob(jobId: string): Promise<VideoRenderJob | null> {
    try {
      const row = await db('video_render_jobs').where('id', jobId).first();
      if (row) {
        return {
          jobId: row.id,
          brandId: row.brand_id,
          status: row.status,
          progress: row.progress,
          stage: row.stage,
          resultAsset: row.result_asset_id
            ? {
                id: row.result_asset_id,
                publicUrl: row.public_url,
                thumbnailUrl: row.thumbnail_url,
              }
            : undefined,
          error: row.error_message,
          retries: row.retries,
          requestPayload: typeof row.request_payload === 'string' ? JSON.parse(row.request_payload) : row.request_payload,
          createdAt: row.created_at,
          completedAt: row.completed_at,
        };
      }
    } catch {}
    return videoJobs.get(jobId) || null;
  }

  // List recent jobs for a brand
  public static async listJobs(brandId: string): Promise<VideoRenderJob[]> {
    try {
      const rows = await db('video_render_jobs')
        .where('brand_id', brandId)
        .orderBy('created_at', 'desc')
        .limit(20);

      return rows.map((row) => ({
        jobId: row.id,
        brandId: row.brand_id,
        status: row.status,
        progress: row.progress,
        stage: row.stage,
        resultAsset: row.result_asset_id
          ? {
              id: row.result_asset_id,
              publicUrl: row.public_url,
              thumbnailUrl: row.thumbnail_url,
            }
          : undefined,
        error: row.error_message,
        retries: row.retries,
        createdAt: row.created_at,
        completedAt: row.completed_at,
      }));
    } catch (err) {
      console.error('[VideoEngine.listJobs] DB query failed:', err);
      return [];
    }
  }

  // Main rendering method with DB persistence & status updates
  public static async renderReel(
    request: ReelRenderRequest,
    brandInfo?: { id: string; name?: string; primaryColor?: string; logoUrl?: string },
    existingJobId?: string
  ): Promise<RenderedVideoResult> {
    const jobId = existingJobId || crypto.randomUUID();
    const assetId = crypto.randomUUID();
    const ffmpegPath = this.getFfmpegPath();

    // Total duration calculation
    let calculatedDuration = request.durationSec;
    if (!calculatedDuration && request.scenes && request.scenes.length > 0) {
      calculatedDuration = request.scenes.reduce((sum, s) => sum + (s.durationSec || 2.5), 0);
      if (request.includeOutro) calculatedDuration += 2.5;
    }
    const duration = Math.min(Math.max(calculatedDuration || 15, 3), 60);

    // Aspect ratio & resolution normalization
    const aspectRatio = request.aspectRatio || '9:16';
    const qualityPreset = request.qualityPreset || '1080p';

    let width = 1080;
    let height = 1920;

    if (aspectRatio === '16:9') {
      if (qualityPreset === '720p') {
        width = 1280;
        height = 720;
      } else if (qualityPreset === '4k') {
        width = 3840;
        height = 2160;
      } else {
        width = 1920;
        height = 1080;
      }
    } else if (aspectRatio === '1:1') {
      if (qualityPreset === '720p') {
        width = 720;
        height = 720;
      } else if (qualityPreset === '4k') {
        width = 2160;
        height = 2160;
      } else {
        width = 1080;
        height = 1080;
      }
    } else {
      // 9:16
      if (qualityPreset === '720p') {
        width = 720;
        height = 1280;
      } else if (qualityPreset === '4k') {
        width = 2160;
        height = 3840;
      } else {
        width = 1080;
        height = 1920;
      }
    }

    const brandId = request.brandId || brandInfo?.id || 'default';

    const jobRecord: VideoRenderJob = {
      jobId,
      brandId,
      status: 'processing',
      progress: 10,
      stage: '1/4 Initializing FFmpeg & Assets',
      createdAt: new Date(),
    };
    videoJobs.set(jobId, jobRecord);

    // Save initial state to database
    try {
      const existing = await db('video_render_jobs').where('id', jobId).first();
      if (!existing) {
        await db('video_render_jobs').insert({
          id: jobId,
          brand_id: brandId,
          status: 'processing',
          progress: 10,
          stage: '1/4 Initializing FFmpeg & Assets',
          request_payload: JSON.stringify(request),
          created_at: new Date(),
          updated_at: new Date(),
        });
      } else {
        await db('video_render_jobs').where('id', jobId).update({
          status: 'processing',
          progress: 10,
          stage: '1/4 Initializing FFmpeg & Assets',
          retries: (existing.retries || 0) + 1,
          error_message: null,
          updated_at: new Date(),
        });
      }
    } catch (dbErr) {
      console.warn('[VideoEngine] Could not persist initial job state to DB:', dbErr);
    }

    const updateProgress = async (progress: number, stage: string) => {
      jobRecord.progress = progress;
      jobRecord.stage = stage;
      try {
        await db('video_render_jobs').where('id', jobId).update({
          progress,
          stage,
          updated_at: new Date(),
        });
      } catch {}
    };

    const fileName = `reel-${jobId.substring(0, 8)}.mp4`;
    const thumbName = `thumb-${jobId.substring(0, 8)}.jpg`;
    const outputMp4Path = path.join(this.outputDir, fileName);
    const outputThumbPath = path.join(this.outputDir, thumbName);

    const filtersApplied: string[] = [`${aspectRatio} Aspect Normalization (${width}x${height})`];

    try {
      // 0. AI Voiceover Narration Track synthesis
      let activeVoiceoverPath: string | null = null;
      let tempVoiceoverCreated = false;

      if (request.voiceoverUrl && typeof request.voiceoverUrl === 'string') {
        const localVoiceCheck = path.resolve(request.voiceoverUrl);
        if (fs.existsSync(localVoiceCheck)) {
          activeVoiceoverPath = localVoiceCheck;
        } else if (request.voiceoverUrl.includes('/uploads/')) {
          const rel = request.voiceoverUrl.substring(request.voiceoverUrl.indexOf('/uploads/') + '/uploads/'.length);
          const localUpload = path.join(this.uploadsBaseDir, rel);
          if (fs.existsSync(localUpload)) activeVoiceoverPath = localUpload;
        } else if (request.voiceoverUrl.startsWith('http')) {
          const scratchTarget = path.join(this.scratchDir, `${jobId}-voiceover.wav`);
          const ok = await this.downloadFile(request.voiceoverUrl, scratchTarget, 10000);
          if (ok && fs.existsSync(scratchTarget)) {
            activeVoiceoverPath = scratchTarget;
            tempVoiceoverCreated = true;
          }
        }
      } else if (request.generateVoiceoverTts || (request.voiceoverPersona && request.voiceoverPersona !== 'none')) {
        try {
          await updateProgress(18, '1/4 Synthesizing AI Voiceover Narration Track');
          const ttsRes = await TtsService.synthesizeScenesNarration(
            request.scenes || [],
            request.voiceoverPersona || 'david'
          );
          if (ttsRes && fs.existsSync(ttsRes.filePath)) {
            activeVoiceoverPath = ttsRes.filePath;
            filtersApplied.push(`AI Voiceover (${request.voiceoverPersona || 'David'}) Narration Track`);
          }
        } catch (ttsErr) {
          console.warn('[VideoEngine] TTS Synthesis notice:', ttsErr);
        }
      }

      // 1. Generate Subtitles ASS file
      let assFilePath: string | null = null;
      if (request.burnSubtitles !== false && request.scenes && request.scenes.length > 0) {
        await updateProgress(28, '2/4 Generating Brand Styled Subtitles');
        assFilePath = this.generateAssFile(request.scenes, jobId, {
          primaryColorHex: request.captionStyleConfig?.primaryColorHex || brandInfo?.primaryColor,
          brandName: brandInfo?.name,
          outroHeadline: request.outroHeadline,
          outroSubtext: request.outroSubtext,
          includeOutro: request.includeOutro,
          motionStyle: request.motionStyle,
          width,
          height,
          aspectRatio,
        });
        filtersApplied.push('Dynamic Brand Styled Subtitles (ASS Burn-in)');
      }

      // 2. Prepare FFmpeg complex filtergraph
      await updateProgress(48, '3/4 Assembling Filtergraph & Audio Mixing');

      const args: string[] = ['-y'];

      // Input 0: Video source
      const videoInput = await this.resolveVideoInput(request.bgVideoUrl, jobId);
      let videoFilterFragment = '';

      // Visual Style ambient background color
      const visualStyle = request.visualStyle || 'corporate';
      let bgColorHex = '0x0b0f19';
      if (visualStyle === 'cinematic') bgColorHex = '0x070b14';
      else if (visualStyle === 'vibrant') bgColorHex = '0x1f0b24';
      else if (visualStyle === 'cyberpunk') bgColorHex = '0x030712';
      else if (visualStyle === 'minimalist') bgColorHex = '0x0f172a';
      else if (visualStyle === 'corporate') bgColorHex = '0x0a192f';

      if (!videoInput.isSynthetic && videoInput.path) {
        // Local or cached input video
        args.push('-i', videoInput.path);
        // Multi-aspect normalization with dual-stream gaussian boxblur backdrop
        videoFilterFragment = `[0:v]split=2[bg_in][fg_in];[bg_in]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=25:5[bg_blurred];[fg_in]scale=${width}:${height}:force_original_aspect_ratio=decrease[fg_scaled];[bg_blurred][fg_scaled]overlay=(W-w)/2:(H-h)/2,trim=duration=${duration},setpts=PTS-STARTPTS[base_v]`;
        filtersApplied.push('Dual-Stream Gaussian Boxblur Backdrop');
      } else {
        // High-aesthetic animated gradient synthetic backdrop matching visual style
        args.push(
          '-f', 'lavfi',
          '-i', `color=c=${bgColorHex}:s=${width}x${height}:d=${duration}:r=30`
        );
        videoFilterFragment = `[0:v]format=yuv420p[base_v]`;
        filtersApplied.push(`Synthetic ${visualStyle} Studio Ambient Backdrop`);
      }

      // Input 1: Background Music (Synthesized harmonic tone if not local audio)
      args.push(
        '-f', 'lavfi',
        '-i', `sine=f=220:d=${duration}`
      );

      // Check if voiceover exists
      let hasVoiceover = false;
      if (activeVoiceoverPath && fs.existsSync(activeVoiceoverPath)) {
        args.push('-i', activeVoiceoverPath);
        hasVoiceover = true;
      }

      // Construct Filter Complex
      let filterComplex = '';

      // Video subtitle stage
      if (assFilePath) {
        const escapedAssPath = assFilePath.replace(/\\/g, '/').replace(':', '\\:');
        filterComplex += `${videoFilterFragment};[base_v]ass='${escapedAssPath}'[v_out];`;
      } else {
        filterComplex += `${videoFilterFragment};[base_v]null[v_out];`;
      }

      // Audio ducking stage
      const musicVol = request.musicVolume !== undefined ? request.musicVolume : 0.35;
      const voxVol = request.voiceoverVolume !== undefined ? request.voiceoverVolume : 0.9;

      if (hasVoiceover) {
        // Apply sidechain ducking (-12dB ducking on bg music when voiceover triggers)
        filterComplex += `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${musicVol}[bg];`;
        filterComplex += `[2:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${voxVol},asplit=2[vox1][vox2];`;
        filterComplex += `[bg][vox1]sidechaincompress=threshold=0.1:ratio=6:attack=50:release=300[ducked_bg];`;
        filterComplex += `[ducked_bg][vox2]amix=inputs=2:duration=first,afade=t=in:st=0:d=0.5,afade=t=out:st=${Math.max(duration - 1, 0.5)}:d=1[a_out]`;
        filtersApplied.push('Dynamic Sidechain Audio Ducking (-12dB)');
      } else {
        // Standard background music with smooth fade-in and fade-out
        filterComplex += `[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=${musicVol},afade=t=in:st=0:d=0.5,afade=t=out:st=${Math.max(duration - 1, 0.5)}:d=1[a_out]`;
        filtersApplied.push('Smooth Stereo Audio Fade-In/Out');
      }

      args.push('-filter_complex', filterComplex);
      args.push('-map', '[v_out]');
      args.push('-map', '[a_out]');
      args.push('-c:v', 'libx264');
      args.push('-preset', 'ultrafast');
      args.push('-pix_fmt', 'yuv420p');
      args.push('-c:a', 'aac');
      args.push('-b:a', '128k');
      args.push('-t', String(duration));
      args.push(outputMp4Path);

      await updateProgress(65, '4/4 Encoding H.264 MP4 & Generating Poster Frame');

      console.log(`[VideoEngine] Spawning FFmpeg job ${jobId}...`);
      await this.runFfmpegProcess(ffmpegPath, args);

      // Extract high-resolution poster frame
      const thumbArgs = [
        '-y',
        '-ss', '00:00:01.000',
        '-i', outputMp4Path,
        '-vframes', '1',
        '-q:v', '2',
        outputThumbPath,
      ];
      await this.runFfmpegProcess(ffmpegPath, thumbArgs);

      const stats = fs.statSync(outputMp4Path);
      const publicUrl = `http://localhost:4000/uploads/video-renders/output/${fileName}`;
      const thumbnailUrl = `http://localhost:4000/uploads/video-renders/output/${thumbName}`;

      const result: RenderedVideoResult = {
        jobId,
        assetId,
        fileName,
        publicUrl,
        thumbnailUrl,
        durationSec: duration,
        width,
        height,
        fileSizeBytes: stats.size,
        codec: 'h264/aac',
        engineUsed: 'native_ffmpeg',
        filtersApplied,
      };

      jobRecord.status = 'completed';
      jobRecord.progress = 100;
      jobRecord.stage = 'Completed';
      jobRecord.resultAsset = result;
      jobRecord.completedAt = new Date();

      // Persist completed status in DB (asset linkage done in controller after media_assets insert)
      try {
        await db('video_render_jobs').where('id', jobId).update({
          status: 'completed',
          progress: 100,
          stage: 'Completed',
          public_url: publicUrl,
          thumbnail_url: thumbnailUrl,
          completed_at: new Date(),
          updated_at: new Date(),
        });
      } catch (dbErr) {
        console.warn('[VideoEngine] Could not update completed status in DB:', dbErr);
      }

      // Clean up scratch ASS file if created
      if (assFilePath && fs.existsSync(assFilePath)) {
        try {
          fs.unlinkSync(assFilePath);
        } catch {}
      }

      return result;
    } catch (err: any) {
      console.error(`[VideoEngine] Render failed for job ${jobId}:`, err);
      jobRecord.status = 'failed';
      jobRecord.error = err.message || 'FFmpeg render error';

      try {
        await db('video_render_jobs').where('id', jobId).update({
          status: 'failed',
          error_message: err.message || 'FFmpeg render error',
          updated_at: new Date(),
        });
      } catch {}

      throw err;
    }
  }

  // Promise-wrapped FFmpeg runner with 120s timeout
  private static runFfmpegProcess(ffmpegPath: string, args: string[], timeoutMs = 120000): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, args);
      let stderrOutput = '';

      const timeoutTimer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`FFmpeg process timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);

      proc.stderr.on('data', (d) => {
        stderrOutput += d.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeoutTimer);
        if (code === 0) {
          resolve();
        } else {
          console.error('[VideoEngine FFmpeg Stderr]:', stderrOutput.slice(-1000));
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeoutTimer);
        reject(err);
      });
    });
  }
}
