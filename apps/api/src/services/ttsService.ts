import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

export interface TtsSynthesizeOptions {
  text: string;
  voicePersona?: string;
  language?: string;
  speechRate?: number; // -10 to +10, 0 is default normal speed
  outputPath?: string;
}

export interface TtsResult {
  filePath: string;
  fileName: string;
  durationSec: number;
  publicUrl: string;
  fileSizeBytes: number;
}

export class TtsService {
  private static getUploadsBase(): string {
    const rootUploads = path.resolve(process.cwd(), '../../uploads');
    if (fs.existsSync(rootUploads)) return rootUploads;
    const parentUploads = path.resolve(process.cwd(), '../uploads');
    if (fs.existsSync(parentUploads)) return parentUploads;
    return path.resolve(process.cwd(), 'uploads');
  }

  private static scratchDir = path.resolve(TtsService.getUploadsBase(), 'video-renders/scratch');
  private static outputDir = path.resolve(TtsService.getUploadsBase(), 'video-renders/output');
  private static psPath = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

  static {
    try {
      fs.mkdirSync(this.scratchDir, { recursive: true });
      fs.mkdirSync(this.outputDir, { recursive: true });
    } catch (err) {
      console.error('[TtsService] Error initializing directories:', err);
    }
  }

  // Resolve voice persona name to Windows SAPI installed voice pattern
  private static resolveVoicePattern(persona?: string): string {
    const p = (persona || '').toLowerCase();
    if (p.includes('hazel') || p.includes('warm') || p.includes('british')) {
      return '*Hazel*';
    }
    if (p.includes('zira') || p.includes('crisp') || p.includes('energetic')) {
      return '*Zira*';
    }
    // Default to David (deep authoritative male)
    return '*David*';
  }

  // Probe audio duration using FFmpeg
  public static probeAudioDuration(audioPath: string): number {
    try {
      const probe = spawnSync(ffmpegInstaller.path || 'ffmpeg', ['-i', audioPath]);
      const probeOut = probe.stderr ? probe.stderr.toString() : '';
      const durMatch = probeOut.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (durMatch) {
        return (
          parseInt(durMatch[1], 10) * 3600 +
          parseInt(durMatch[2], 10) * 60 +
          parseFloat(durMatch[3])
        );
      }
    } catch (err) {
      console.warn('[TtsService] Could not probe audio duration:', err);
    }
    return 3.0; // fallback duration
  }

  // Synthesize speech to WAV using native System.Speech
  public static async synthesizeSpeech(options: TtsSynthesizeOptions): Promise<TtsResult> {
    const text = (options.text || '').trim();
    if (!text) {
      throw new Error('Text is required for TTS synthesis');
    }

    const fileId = crypto.randomUUID().substring(0, 10);
    const fileName = `voiceover-${fileId}.wav`;
    const destPath = options.outputPath || path.join(this.outputDir, fileName);
    const scriptPath = path.join(this.scratchDir, `tts-${fileId}.ps1`);

    const voicePattern = this.resolveVoicePattern(options.voicePersona);
    const rate = Math.max(Math.min(options.speechRate || 0, 10), -10);

    // Clean text for PowerShell string
    const sanitizedText = text
      .replace(/[\r\n]+/g, ' ')
      .replace(/'/g, "''")
      .trim();

    const psScript = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$installed = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
$targetVoice = $installed | Where-Object { $_ -like "${voicePattern}" } | Select-Object -First 1
if ($targetVoice) { 
    $synth.SelectVoice($targetVoice) 
} elseif ($installed.Count -gt 0) {
    $synth.SelectVoice($installed[0])
}
$synth.Rate = ${rate}
$synth.SetOutputToWaveFile('${destPath.replace(/\\/g, '\\\\')}')
$synth.Speak('${sanitizedText}')
$synth.Dispose()
`;

    fs.writeFileSync(scriptPath, psScript, 'utf8');

    try {
      const res = spawnSync(this.psPath, [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        scriptPath,
      ]);

      if (res.error) {
        throw new Error(`TTS Process error: ${res.error.message}`);
      }

      if (!fs.existsSync(destPath) || fs.statSync(destPath).size < 100) {
        throw new Error(`TTS generation produced empty or missing file. Code: ${res.status}`);
      }

      const stat = fs.statSync(destPath);
      const durationSec = this.probeAudioDuration(destPath);
      const publicUrl = `http://localhost:4000/uploads/video-renders/output/${path.basename(destPath)}`;

      // Clean up scratch script
      try {
        fs.unlinkSync(scriptPath);
      } catch { }

      return {
        filePath: destPath,
        fileName: path.basename(destPath),
        durationSec,
        publicUrl,
        fileSizeBytes: stat.size,
      };
    } catch (err: any) {
      try {
        if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
      } catch { }
      throw err;
    }
  }

  // Synthesize narration script for scenes, combining them into one coherent narration track
  public static async synthesizeScenesNarration(
    scenes: Array<{ headline: string; subtext?: string; narrationScript?: string; durationSec: number }>,
    voicePersona?: string
  ): Promise<TtsResult | null> {
    const narrationParts = scenes
      .map((s) => s.narrationScript || `${s.headline}. ${s.subtext || ''}`.trim())
      .filter(Boolean);

    if (narrationParts.length === 0) return null;

    const fullScript = narrationParts.join(' ... ');
    return this.synthesizeSpeech({
      text: fullScript,
      voicePersona,
    });
  }
}
