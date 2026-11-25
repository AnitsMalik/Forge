import { TtsService } from '../apps/api/dist/services/ttsService.js';

async function test() {
  console.log('Testing TtsService with David voice...');
  const res1 = await TtsService.synthesizeSpeech({
    text: 'Welcome to SocialForge AI Video Reels Studio. Create 30 second videos in seconds.',
    voicePersona: 'david',
  });
  console.log('David result:', res1);

  console.log('Testing TtsService with Zira voice...');
  const res2 = await TtsService.synthesizeSpeech({
    text: 'Scale your marketing with automated multi-scene video rendering.',
    voicePersona: 'zira',
  });
  console.log('Zira result:', res2);
}

test().catch(console.error);
