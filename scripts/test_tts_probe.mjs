import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

const text = "Unlock early access perks today. Discover high velocity AI video generation with SocialForge.";
const wavPath = path.resolve('uploads/video-renders/scratch/test_voiceover.wav');

fs.mkdirSync(path.dirname(wavPath), { recursive: true });

const psPath = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
const scriptFile = path.resolve('uploads/video-renders/scratch/tts_script.ps1');

const psScript = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$installed = $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
$targetVoice = $installed | Where-Object { $_ -like "*David*" } | Select-Object -First 1
if ($targetVoice) { $synth.SelectVoice($targetVoice) }
$synth.Rate = 0
$synth.SetOutputToWaveFile('${wavPath.replace(/\\/g, '\\\\')}')
$synth.Speak('${text.replace(/'/g, "''")}')
$synth.Dispose()
`;

fs.writeFileSync(scriptFile, psScript, 'utf8');

const res = spawnSync(psPath, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptFile]);
console.log('PowerShell exit code:', res.status);
if (fs.existsSync(wavPath)) {
  const stat = fs.statSync(wavPath);
  console.log('WAV generated successfully! Size:', stat.size);

  const probe = spawnSync(ffmpegInstaller.path, ['-i', wavPath]);
  const probeOut = probe.stderr.toString();
  const durMatch = probeOut.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  if (durMatch) {
    const secs = parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseFloat(durMatch[3]);
    console.log('Probe duration seconds:', secs);
  }
} else {
  console.error('WAV not found. Stderr:', res.stderr ? res.stderr.toString() : 'no stderr');
}
