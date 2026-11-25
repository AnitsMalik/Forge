import { spawnSync } from 'child_process';
import fs from 'fs';
const PS = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
console.log('PS exists:', fs.existsSync(PS));
const r = spawnSync(PS, ['-NoProfile', '-Command',
  "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name + ' | ' + $_.VoiceInfo.Culture + ' | ' + $_.VoiceInfo.Gender + ' | ' + $_.Enabled }"], { encoding: 'utf8' });
console.log('status', r.status, '\n', r.stdout, r.stderr);
const r2 = spawnSync(PS, ['-NoProfile', '-Command',
  "Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SetOutputToWaveFile('" + process.cwd().replace(/\\/g, '\\\\') + "\\\\scratch_tts_test.wav'); $s.Speak('SocialForge voiceover test.'); $s.Dispose()"], { encoding: 'utf8' });
console.log('tts status', r2.status, r2.stderr, fs.existsSync('scratch_tts_test.wav') ? fs.statSync('scratch_tts_test.wav').size + ' bytes' : 'no file');
try { fs.unlinkSync('scratch_tts_test.wav'); } catch {}

