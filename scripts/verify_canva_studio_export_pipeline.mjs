import { db } from '../apps/api/dist/db/connection.js';
import { AiPosterService } from '../apps/api/dist/services/aiPosterService.js';
import fs from 'fs';

console.log('========================================================');
console.log('   CANVA STUDIO EXPORT PIPELINE & PRESET VERIFICATION   ');
console.log('========================================================\n');

let passCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// 1. Inspect CanvaStudioModal.tsx to verify all Preset IDs and Dim mappings exist in code
console.log('[1/4] Inspecting CanvaStudioModal Presets & Canvas Ratios...');
const modalContent = fs.readFileSync('apps/web/src/components/CanvaStudioModal.tsx', 'utf-8');

const expectedPresets = [
  'instagram_square',
  'instagram_portrait',
  'instagram_story',
  'tiktok_video_cover',
  'pinterest_pin',
  'facebook',
  'linkedin',
  'x',
  'youtube_thumbnail',
];

expectedPresets.forEach((pid) => {
  const present = modalContent.includes(`id: '${pid}'`);
  assert(present, `Preset '${pid}' defined in DESIGN_FORMAT_PRESETS`);
});

// 2. Verify Canvas Base Dimensions
console.log('\n[2/4] Verifying Base Dimensions for All Canvas Ratios...');
const expectedBaseKeys = [
  'instagram_square',
  'instagram_portrait',
  'instagram_story',
  'facebook',
  'linkedin',
  'x',
  'youtube_thumbnail',
  'tiktok_video_cover',
  'pinterest_pin',
  '1:1',
  '4:5',
  '1.91:1',
  '9:16',
  '16:9',
  '2:3',
];

expectedBaseKeys.forEach((key) => {
  const hasDim = modalContent.includes(`${key.includes(':') ? `'${key}'` : key}: { width:`);
  assert(hasDim, `CANVAS_BASE_DIMENSIONS contains mapping for '${key}'`);
});

// 3. Verify AI Poster Generation Service across Style Archetypes
console.log('\n[3/4] Testing AI Poster Generator Engine...');
const styles = ['modern_gradient', 'minimalist_editorial', 'bold_impact', 'stat_highlight', 'dark_luxe'];

for (const style of styles) {
  const generated = AiPosterService.generatePoster({
    text: `Drive 10x Pipeline Growth with Autonomous AI Marketing (${style})`,
    brandName: 'HOASP International',
    brandSlug: 'hoasp-international',
    primaryColor: '#8b5cf6',
    accentColor: '#ec4899',
    backgroundColor: '#0b0f19',
    textColor: '#ffffff',
    style,
    aspectRatio: '1:1',
  });

  assert(!!generated, `AiPosterService generated valid poster for style '${style}'`);
  assert(generated.layers && generated.layers.length >= 3, `Poster '${style}' generated ${generated?.layers?.length} layers`);
  assert(!!generated.headline, `Poster '${style}' headline generated`);
  assert(!!generated.background, `Poster '${style}' background generated: ${generated?.background?.type}`);
}

// 4. Verify TikTok (9:16) & Pinterest (2:3) Presets in AiPosterService
console.log('\n[4/4] Testing Vertical & Pin Aspect Ratios in AI Poster Engine...');
const tiktokPoster = AiPosterService.generatePoster({
  text: 'Exclusive Reel: Behind the scenes with autonomous content generation',
  brandName: 'HOASP International',
  brandSlug: 'hoasp-international',
  primaryColor: '#8b5cf6',
  accentColor: '#ec4899',
  style: 'bold_impact',
  aspectRatio: '9:16',
});
assert(tiktokPoster.aspectRatio === '9:16', 'TikTok 9:16 aspect ratio preserved in poster generation');
assert(tiktokPoster.layers.some((l) => l.type === 'text'), 'TikTok poster includes text layer');

const pinterestPoster = AiPosterService.generatePoster({
  text: '10 Essential Rules for High-Converting Social Marketing Campaigns',
  brandName: 'HOASP International',
  brandSlug: 'hoasp-international',
  primaryColor: '#8b5cf6',
  accentColor: '#ec4899',
  style: 'minimalist_editorial',
  aspectRatio: '2:3',
});
assert(pinterestPoster.aspectRatio === '2:3', 'Pinterest 2:3 aspect ratio preserved in poster generation');

await db.destroy();

console.log('\n========================================================');
console.log(`  RESULT: ${passCount} / ${totalCount} ASSERTIONS PASSED (${Math.round((passCount / totalCount) * 100)}%)`);
console.log('========================================================');

if (passCount !== totalCount) {
  process.exit(1);
}
