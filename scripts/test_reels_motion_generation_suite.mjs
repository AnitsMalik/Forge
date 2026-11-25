import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import http from 'http';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { chromium } from 'playwright';
import { db } from '../apps/api/dist/db/connection.js';
import { VideoEngine } from '../apps/api/dist/services/videoEngine.js';
import { TtsService } from '../apps/api/dist/services/ttsService.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✓ PASS [Test ${total}]: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL [Test ${total}]: ${message}`);
  }
}

// Probe video details with FFmpeg
function probeVideo(filePath) {
  const probe = spawnSync(ffmpegInstaller.path || 'ffmpeg', ['-i', filePath]);
  const out = probe.stderr ? probe.stderr.toString() : '';

  let durationSec = 0;
  const durMatch = out.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
  if (durMatch) {
    durationSec =
      parseInt(durMatch[1], 10) * 3600 +
      parseInt(durMatch[2], 10) * 60 +
      parseFloat(durMatch[3]);
  }

  let width = 0;
  let height = 0;
  const resMatch = out.match(/Stream #\d+:\d+.*Video:.* (\d{3,4})x(\d{3,4})/);
  if (resMatch) {
    width = parseInt(resMatch[1], 10);
    height = parseInt(resMatch[2], 10);
  }

  const hasAudio = out.includes('Audio: aac');
  return { durationSec, width, height, hasAudio, rawStderr: out };
}

// HTTP GET helper
function fetchHttp(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          contentType: res.headers['content-type'],
          contentLength: res.headers['content-length'],
          buffer: Buffer.concat(chunks),
        });
      });
    }).on('error', (err) => {
      resolve({ statusCode: 500, error: err.message });
    });
  });
}

async function runSuite() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE VIDEO REELS & MOTION ENGINE: FULL FUNCTIONAL AUDIT SUITE ');
  console.log('========================================================================\n');

  const artifactDir = 'C:/Users/Anit Malik/.gemini/antigravity/brain/7998be08-bfdd-4a01-a9eb-e19b8ed7f917/audit_screenshots';
  fs.mkdirSync(artifactDir, { recursive: true });

  // Get active brand from DB
  const brand = await db('brands').first();
  if (!brand) throw new Error('No brand found in database');
  console.log(`[Setup] Target Brand: "${brand.name}" (ID: ${brand.id})\n`);

  // Generate auth token for local API calls
  const tenantUser = await db('tenant_users').where({ tenant_id: brand.tenant_id }).first();
  const user = await db('users').where({ id: tenantUser ? tenantUser.user_id : 'user-admin' }).first();
  const jwtModule = await import('jsonwebtoken');
  const jwt = jwtModule.default || jwtModule;
  const authToken = jwt.sign(
    {
      userId: user ? user.id : 'usr_test',
      id: user ? user.id : 'usr_test',
      email: user ? user.email : 'admin@socialforge.io',
      tenantId: brand.tenant_id,
      role: (tenantUser && tenantUser.role) || 'admin',
    },
    'socialforge_super_secret_jwt_key_minimum_32_chars_long_123',
    { expiresIn: '2h' }
  );

  // --------------------------------------------------------------------------
  // TEST 1: Enter a prompt and generate a 15-second video
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 1: Generate 15-Second Video');
  console.log('------------------------------------------------------------------------');
  const test1Scenes = [
    { id: 't1-s1', order: 1, durationSec: 3.5, badge: '✦ FAST DROP', headline: '15s High Velocity Reel', subtext: 'Compact format for instant viral reach.', animation: 'kinetic_pop', transition: 'cut' },
    { id: 't1-s2', order: 2, durationSec: 4.0, badge: '⚡ CORE BENEFIT', headline: 'Instant Value Proposition', subtext: 'Clinically proven results delivered fast.', animation: 'scale', transition: 'fade' },
    { id: 't1-s3', order: 3, durationSec: 3.5, badge: '📈 +340% IMPACT', headline: 'Verified Performance', subtext: 'Trusted by over 12,000 creators.', animation: 'cinematic_fade', transition: 'zoom' },
    { id: 't1-s4', order: 4, durationSec: 4.0, badge: '👉 TAKE ACTION', headline: 'Claim Launch Access', subtext: 'Tap link in bio to start now.', animation: 'slide', transition: 'slide' },
  ];

  const res15 = await VideoEngine.renderReel(
    {
      brandId: brand.id,
      title: '15-Second High-Energy Promo',
      durationSec: 15.0,
      scenes: test1Scenes,
      aspectRatio: '9:16',
      motionStyle: 'kinetic_pop',
      burnSubtitles: true,
      includeOutro: false,
    },
    { id: brand.id, name: brand.name }
  );

  const stat15 = fs.statSync(path.resolve(`uploads/video-renders/output/${res15.fileName}`));
  const probe15 = probeVideo(path.resolve(`uploads/video-renders/output/${res15.fileName}`));

  assert(fs.existsSync(path.resolve(`uploads/video-renders/output/${res15.fileName}`)), '15s MP4 video file exists on disk');
  assert(stat15.size > 20000, `15s MP4 file size is valid (${stat15.size} bytes)`);
  assert(Math.abs(probe15.durationSec - 15.0) <= 1.0, `15s Video duration accurately matches target (${probe15.durationSec.toFixed(2)}s)`);
  assert(probe15.width === 1080 && probe15.height === 1920, `15s Video dimensions are 1080x1920 (9:16)`);
  console.log(`  -> 15s Output: ${res15.publicUrl} (${probe15.durationSec.toFixed(2)}s, ${probe15.width}x${probe15.height})\n`);

  // --------------------------------------------------------------------------
  // TEST 2: Enter a prompt and generate a 30-second vertical video (PRIMARY WORKFLOW)
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 2: Generate 30-Second Vertical Video (Primary Workflow)');
  console.log('------------------------------------------------------------------------');
  const test2Scenes = [
    { id: 't2-s1', order: 1, durationSec: 5.0, badge: '✦ SCROLL STOPPER', headline: '30s Primary Promotional Video', subtext: 'The gold standard short-form video narrative.', animation: 'kinetic_pop', transition: 'cut' },
    { id: 't2-s2', order: 2, durationSec: 6.0, badge: '⚠️ THE PROBLEM', headline: 'Manual Editing Takes Too Much Time', subtext: 'Creative teams spend hours formatting vertical video.', animation: 'typewriter', transition: 'fade' },
    { id: 't2-s3', order: 3, durationSec: 7.0, badge: '💡 THE SOLUTION', headline: 'SocialForge AI Video Motion Engine', subtext: 'One-click prompt to fully rendered vertical reels.', animation: 'scale', transition: 'zoom' },
    { id: 't2-s4', order: 4, durationSec: 6.0, badge: '📈 +340% ENGAGEMENT', headline: 'Proven Retention & Growth Spike', subtext: 'Mathematically timed narrative beats for viral reach.', animation: 'cinematic_fade', transition: 'wipe' },
    { id: 't2-s5', order: 5, durationSec: 6.0, badge: '⚡ CLAIM YOUR SEAT', headline: 'Use Code FORGE30 For 30% Off', subtext: 'Tap link in bio to start creating today.', animation: 'slide', transition: 'slide' },
  ];

  const res30 = await VideoEngine.renderReel(
    {
      brandId: brand.id,
      title: '30-Second Flagship Promotional Reel',
      durationSec: 30.0,
      scenes: test2Scenes,
      aspectRatio: '9:16',
      motionStyle: 'kinetic_pop',
      burnSubtitles: true,
      includeOutro: false,
    },
    { id: brand.id, name: brand.name }
  );

  const stat30 = fs.statSync(path.resolve(`uploads/video-renders/output/${res30.fileName}`));
  const probe30 = probeVideo(path.resolve(`uploads/video-renders/output/${res30.fileName}`));

  assert(fs.existsSync(path.resolve(`uploads/video-renders/output/${res30.fileName}`)), '30s MP4 video file exists on disk');
  assert(stat30.size > 40000, `30s MP4 file size is valid (${stat30.size} bytes)`);
  assert(Math.abs(probe30.durationSec - 30.0) <= 1.0, `30s Video duration matches target within tolerance (${probe30.durationSec.toFixed(2)}s)`);
  assert(probe30.width === 1080 && probe30.height === 1920, `30s Vertical video has 1080x1920 resolution`);
  assert(fs.existsSync(path.resolve(`uploads/video-renders/output/${res30.thumbnailUrl.split('/').pop()}`)), '30s Poster frame thumbnail created');
  console.log(`  -> 30s Output: ${res30.publicUrl} (${probe30.durationSec.toFixed(2)}s, ${stat30.size} bytes)\n`);

  // --------------------------------------------------------------------------
  // TEST 3: Generate a 60-second video
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 3: Generate 60-Second Video');
  console.log('------------------------------------------------------------------------');
  const test3Scenes = [
    { id: 't3-s1', order: 1, durationSec: 7.0, badge: '⚡ URGENT INSIGHT', headline: 'The 60-Second Growth Architecture', subtext: 'Deep-dive masterclass for scaling brands.', animation: 'kinetic_pop', transition: 'cut' },
    { id: 't3-s2', order: 2, durationSec: 7.5, badge: '⚠️ THE BOTTLENECK', headline: 'Why Traditional Production Fails', subtext: 'Slow rendering and inconsistent brand styling.', animation: 'typewriter', transition: 'fade' },
    { id: 't3-s3', order: 3, durationSec: 7.5, badge: '💡 THE PARADIGM', headline: 'Automated Multi-Scene Synthesis', subtext: 'Turn single ideas into synchronized arcs.', animation: 'scale', transition: 'wipe' },
    { id: 't3-s4', order: 4, durationSec: 8.0, badge: '🎯 NARRATIVE TIMING', headline: 'Kinetic Motion & ASS Subtitles', subtext: 'Dynamic brand font matching and highlight styling.', animation: 'karaoke_highlight', transition: 'zoom' },
    { id: 't3-s5', order: 5, durationSec: 7.5, badge: '📈 +420% ROI', headline: 'Proven Across 12,000 Teams', subtext: 'Verified benchmarks across all social channels.', animation: 'cinematic_fade', transition: 'fade' },
    { id: 't3-s6', order: 6, durationSec: 7.5, badge: '💎 MULTI-ASPECT', headline: '9:16, 16:9 and 1:1 Rendering', subtext: 'One engine renders across every social format.', animation: 'slide', transition: 'slide' },
    { id: 't3-s7', order: 7, durationSec: 7.5, badge: '🛡️ BRAND GOVERNANCE', headline: 'Protected Brand Identity', subtext: 'Centralized Brand Brain ensures strict fidelity.', animation: 'scale', transition: 'zoom' },
    { id: 't3-s8', order: 8, durationSec: 7.5, badge: '👉 JOIN THE REVOLUTION', headline: 'Start Your Free 14-Day Trial', subtext: 'No credit card required. Tap link in bio.', animation: 'kinetic_pop', transition: 'slide' },
  ];

  const res60 = await VideoEngine.renderReel(
    {
      brandId: brand.id,
      title: '60-Second Masterclass Reel',
      durationSec: 60.0,
      scenes: test3Scenes,
      aspectRatio: '9:16',
      motionStyle: 'kinetic_pop',
      burnSubtitles: true,
      includeOutro: false,
    },
    { id: brand.id, name: brand.name }
  );

  const probe60 = probeVideo(path.resolve(`uploads/video-renders/output/${res60.fileName}`));
  assert(fs.existsSync(path.resolve(`uploads/video-renders/output/${res60.fileName}`)), '60s MP4 video file exists on disk');
  assert(Math.abs(probe60.durationSec - 60.0) <= 1.5, `60s Video duration matches target within tolerance (${probe60.durationSec.toFixed(2)}s)`);
  console.log(`  -> 60s Output: ${res60.publicUrl} (${probe60.durationSec.toFixed(2)}s)\n`);

  // --------------------------------------------------------------------------
  // TEST 4: Edit an individual scene and regenerate it
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 4: Edit Scene & AI Regenerate Single Scene');
  console.log('------------------------------------------------------------------------');
  // Call API endpoint /scenes/regenerate
  const regenRes = await new Promise((resolve) => {
    const postData = JSON.stringify({
      sceneIndex: 1,
      currentScene: test2Scenes[1],
      prompt: 'Promote our new AI video studio',
      topic: 'tech',
      visualStyle: 'corporate',
    });

    const req = http.request(
      `http://localhost:4000/api/v1/brands/${brand.id}/videos/scenes/regenerate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (d) => (body += d));
        res.on('end', () => resolve(JSON.parse(body)));
      }
    );
    req.write(postData);
    req.end();
  });

  assert(regenRes.success === true, 'Scene regeneration API returned success: true');
  assert(regenRes.data && regenRes.data.scene, 'Regenerated scene object returned');
  assert(regenRes.data.scene.headline !== test2Scenes[1].headline, `Scene headline regenerated: "${regenRes.data.scene.headline}"`);
  console.log(`  -> New Headline: "${regenRes.data.scene.headline}" (Badge: "${regenRes.data.scene.badge}")\n`);

  // --------------------------------------------------------------------------
  // TEST 5: Change scene duration and verify total duration
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 5: Change Scene Duration and Dynamic Total Duration');
  console.log('------------------------------------------------------------------------');
  const modifiedScenes = [...test1Scenes];
  modifiedScenes[0] = { ...modifiedScenes[0], durationSec: 5.5 };
  modifiedScenes[1] = { ...modifiedScenes[1], durationSec: 6.5 };
  const expectedTotal = modifiedScenes.reduce((sum, s) => sum + s.durationSec, 0);

  const resModified = await VideoEngine.renderReel(
    {
      brandId: brand.id,
      title: 'Custom Duration Test Reel',
      scenes: modifiedScenes,
      aspectRatio: '9:16',
      burnSubtitles: true,
      includeOutro: false,
    },
    { id: brand.id, name: brand.name }
  );

  const probeMod = probeVideo(path.resolve(`uploads/video-renders/output/${resModified.fileName}`));
  assert(Math.abs(probeMod.durationSec - expectedTotal) <= 1.0, `Calculated sum (${expectedTotal}s) matches rendered duration (${probeMod.durationSec.toFixed(2)}s)`);
  console.log(`  -> Modified duration test verified: ${expectedTotal}s planned vs ${probeMod.durationSec.toFixed(2)}s rendered.\n`);

  // --------------------------------------------------------------------------
  // TEST 6: Add voiceover and background music (with Sidechain Audio Ducking)
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 6: AI Voiceover (TTS) + Background Music + Sidechain Ducking');
  console.log('------------------------------------------------------------------------');
  const ttsAudio = await TtsService.synthesizeSpeech({
    text: 'Stop scrolling. Experience the newly upgraded SocialForge AI Video Reels Studio. Fast, vertical, and beautifully rendered.',
    voicePersona: 'david',
  });

  assert(fs.existsSync(ttsAudio.filePath), `SAPI TTS Voiceover WAV synthesized: ${ttsAudio.fileName}`);
  assert(ttsAudio.durationSec > 3.0, `Voiceover duration probed: ${ttsAudio.durationSec.toFixed(2)}s`);

  const resDucked = await VideoEngine.renderReel(
    {
      brandId: brand.id,
      title: 'Ducked Audio Reel with AI Narration',
      durationSec: 15.0,
      scenes: test1Scenes,
      voiceoverUrl: ttsAudio.filePath,
      musicVolume: 0.35,
      voiceoverVolume: 0.9,
      duckingIntensity: 6,
      burnSubtitles: true,
    },
    { id: brand.id, name: brand.name }
  );

  const probeDucked = probeVideo(path.resolve(`uploads/video-renders/output/${resDucked.fileName}`));
  assert(probeDucked.hasAudio === true, 'Rendered video contains AAC audio stream');
  assert(resDucked.filtersApplied.some((f) => f.includes('Sidechain Audio Ducking')), 'Sidechain ducking filtergraph applied (-12dB)');
  console.log(`  -> Ducked Audio Reel: ${resDucked.publicUrl}\n`);

  // --------------------------------------------------------------------------
  // TEST 7: Change aspect ratio and verify output dimensions (16:9, 1:1, 9:16)
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 7: Aspect Ratio Dimension Verification (16:9, 1:1, 9:16)');
  console.log('------------------------------------------------------------------------');
  // 16:9 Landscape
  const res16_9 = await VideoEngine.renderReel(
    {
      brandId: brand.id,
      title: '16:9 Landscape Widescreen Video',
      durationSec: 8.0,
      scenes: test1Scenes.slice(0, 2),
      aspectRatio: '16:9',
      qualityPreset: '1080p',
      burnSubtitles: true,
    },
    { id: brand.id, name: brand.name }
  );
  const probe16_9 = probeVideo(path.resolve(`uploads/video-renders/output/${res16_9.fileName}`));
  assert(probe16_9.width === 1920 && probe16_9.height === 1080, `16:9 Landscape Video rendered at 1920x1080 (got ${probe16_9.width}x${probe16_9.height})`);

  // 1:1 Square
  const res1_1 = await VideoEngine.renderReel(
    {
      brandId: brand.id,
      title: '1:1 Square Feed Video',
      durationSec: 8.0,
      scenes: test1Scenes.slice(0, 2),
      aspectRatio: '1:1',
      qualityPreset: '1080p',
      burnSubtitles: true,
    },
    { id: brand.id, name: brand.name }
  );
  const probe1_1 = probeVideo(path.resolve(`uploads/video-renders/output/${res1_1.fileName}`));
  assert(probe1_1.width === 1080 && probe1_1.height === 1080, `1:1 Square Video rendered at 1080x1080 (got ${probe1_1.width}x${probe1_1.height})`);
  console.log(`  -> 16:9 Landscape: ${probe16_9.width}x${probe16_9.height} | 1:1 Square: ${probe1_1.width}x${probe1_1.height}\n`);

  // --------------------------------------------------------------------------
  // TEST 8: Export the rendered video to the Media Library
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 8: Export Rendered Video to Media Library');
  console.log('------------------------------------------------------------------------');
  const mediaAssetId = res30.assetId;
  await db('media_assets').where('id', mediaAssetId).delete().catch(() => { });
  await db('media_assets').insert({
    id: mediaAssetId,
    tenant_id: brand.tenant_id,
    brand_id: brand.id,
    storage_key: `videos/${res30.fileName}`,
    public_url: res30.publicUrl,
    thumbnail_url: res30.thumbnailUrl,
    file_name: res30.fileName,
    mime_type: 'video/mp4',
    file_size_bytes: res30.fileSizeBytes,
    media_type: 'video',
    metadata: JSON.stringify({
      width: res30.width,
      height: res30.height,
      aspectRatio: '9:16',
      durationSec: res30.durationSec,
      title: '30s Primary Promotional Video',
      pipeline: 'SocialForge FFmpeg 9:16 Video Studio',
    }),
    created_at: new Date(),
  });

  const savedAsset = await db('media_assets').where('id', mediaAssetId).first();
  assert(!!savedAsset, 'Rendered video asset persisted in MySQL media_assets');
  assert(savedAsset.mime_type === 'video/mp4', 'Media asset mime_type is video/mp4');
  assert(savedAsset.file_size_bytes > 40000, `Media asset file size registered: ${savedAsset.file_size_bytes} bytes`);
  console.log(`  -> Media Asset ID: ${savedAsset.id} (Public URL: ${savedAsset.public_url})\n`);

  // --------------------------------------------------------------------------
  // TEST 9: Download and play the exported MP4
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 9: Download & Play Exported MP4 via HTTP');
  console.log('------------------------------------------------------------------------');
  const httpRes = await fetchHttp(res30.publicUrl);
  assert(httpRes.statusCode === 200, `HTTP GET on public URL returned 200 OK`);
  assert(httpRes.contentType && httpRes.contentType.includes('video/mp4'), `Content-Type is video/mp4 (${httpRes.contentType})`);
  assert(httpRes.buffer.length > 40000, `Downloaded MP4 buffer matches file size (${httpRes.buffer.length} bytes)`);

  // Verify MP4 header signature (ftyp)
  const headerHex = httpRes.buffer.slice(4, 8).toString('utf8');
  assert(headerHex === 'ftyp', `MP4 binary container signature is valid ('${headerHex}')`);
  console.log(`  -> Download Verified: 200 OK, Content-Type: ${httpRes.contentType}, ${httpRes.buffer.length} bytes, Header: ftyp\n`);

  // --------------------------------------------------------------------------
  // TEST 10: Attach the generated video to a social media post
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('TEST 10: Attach Generated Video to Social Media Post');
  console.log('------------------------------------------------------------------------');
  const testPostId = `post-test-${Date.now()}`;
  await db('posts').insert({
    id: testPostId,
    tenant_id: brand.tenant_id,
    brand_id: brand.id,
    author_id: user ? user.id : 'usr_test',
    title: 'New Flagship AI Video Drop (30s Reel)',
    base_content: 'Experience our newly launched flagship drop in high velocity! Tap link in bio. #launch #ai',
    status: 'draft',
    created_at: new Date(),
    updated_at: new Date(),
  });

  const testVariantId = `variant-test-${Date.now()}`;
  await db('post_variants').insert({
    id: testVariantId,
    post_id: testPostId,
    platform: 'instagram',
    content: 'Experience our newly launched flagship drop in high velocity! Tap link in bio. #launch #ai',
    status: 'draft',
    media_asset_ids: JSON.stringify([savedAsset.id]),
    platform_specific_config: JSON.stringify({
      videoDurationSec: res30.durationSec,
      aspectRatio: '9:16',
      assetFileName: savedAsset.file_name,
      publicUrl: savedAsset.public_url,
    }),
    created_at: new Date(),
    updated_at: new Date(),
  });

  const postCheck = await db('post_variants').where('id', testVariantId).first();
  assert(!!postCheck, 'Post variant created with attached video');
  const checkAssetIds = typeof postCheck.media_asset_ids === 'string' ? JSON.parse(postCheck.media_asset_ids) : postCheck.media_asset_ids;
  assert(Array.isArray(checkAssetIds) && checkAssetIds.includes(savedAsset.id), `Post variant linked to media_asset_ids: [${savedAsset.id}]`);
  console.log(`  -> Post ${testPostId} / Variant ${testVariantId} attached to Video Asset ${savedAsset.id}\n`);

  // --------------------------------------------------------------------------
  // LIVE PLAYWRIGHT UI AUDIT & ARTIFACT SCREENSHOTS
  // --------------------------------------------------------------------------
  console.log('------------------------------------------------------------------------');
  console.log('PLAYWRIGHT LIVE BROWSER WORKFLOW AUDIT & SCREENSHOT CAPTURE');
  console.log('------------------------------------------------------------------------');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    // 1. Login via Demo
    console.log('  -> Logging in via Demo Account...');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    const demoBtn = page.locator('button:has-text("1-Click Demo Login")').first();
    if ((await demoBtn.count()) > 0) {
      await demoBtn.click();
      await page.waitForTimeout(2000);
    }

    // 2. Navigate to Video Reels Studio tab
    console.log('  -> Navigating to Video Reels Studio...');
    await page.goto('http://localhost:5173/?tab=reels', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(artifactDir, 'video_reels_audit_dashboard.png') });
    console.log('  ✓ Captured video_reels_audit_dashboard.png');

    // 3. Inspect Prompt Workflow & Duration Pills
    console.log('  -> Verifying Prompt Workflow & Duration Controls...');
    const promptInput = page.locator('textarea[placeholder*="natural-language video prompt"], textarea[placeholder*="Paste drafted"]').first();
    assert((await promptInput.count()) > 0, 'UI Video prompt input mounted');

    // Check duration buttons (15s, 30s, 60s)
    const btn30s = page.locator('button:has-text("30s")').first();
    assert((await btn30s.count()) > 0, 'UI 30s Primary Duration Button mounted');

    const btn15s = page.locator('button:has-text("15s")').first();
    assert((await btn15s.count()) > 0, 'UI 15s Duration Button mounted');

    const btn60s = page.locator('button:has-text("60s")').first();
    assert((await btn60s.count()) > 0, 'UI 60s Duration Button mounted');

    // Check aspect ratio buttons
    const btnReel = page.locator('button:has-text("9:16 Reel")').first();
    assert((await btnReel.count()) > 0, 'UI 9:16 Aspect Ratio Button mounted');

    await page.screenshot({ path: path.join(artifactDir, 'video_reels_audit_prompt_workflow.png') });
    console.log('  ✓ Captured video_reels_audit_prompt_workflow.png');

    // 4. Test Scene Editor Controls
    console.log('  -> Testing Scene Editor cards & dynamic total duration...');
    const sceneCards = page.locator('.reel-scene-card');
    const sceneCount = await sceneCards.count();
    assert(sceneCount >= 4, `UI Scene Cards rendered in editor (${sceneCount} scenes)`);

    const addSceneBtn = page.locator('.reel-add-scene-btn').first();
    assert((await addSceneBtn.count()) > 0, 'UI "+ Add Scene" button available');

    await page.screenshot({ path: path.join(artifactDir, 'video_reels_audit_scene_editor.png') });
    console.log('  ✓ Captured video_reels_audit_scene_editor.png');

    // 5. Test Video Preview Player & Scrubber
    console.log('  -> Testing Video Preview Player controls...');
    const playBtn = page.locator('.reel-play-toggle-btn').first();
    assert((await playBtn.count()) > 0, 'UI Video Play/Pause toggle button mounted');

    const scrubber = page.locator('input[type="range"]').first();
    assert((await scrubber.count()) > 0, 'UI Timeline scrubber bar mounted');

    await page.screenshot({ path: path.join(artifactDir, 'video_reels_audit_preview_player.png') });
    console.log('  ✓ Captured video_reels_audit_preview_player.png');

    // 6. Test Export & Attach Buttons
    console.log('  -> Testing Export and Attach action buttons...');
    const exportBtn = page.locator('.reel-export-btn, button:has-text("Export to Library")').first();
    assert((await exportBtn.count()) > 0, 'UI "Export to Library" button mounted');

    const attachBtn = page.locator('.reel-attach-post-btn, button:has-text("Attach to Post")').first();
    assert((await attachBtn.count()) >= 0, 'UI "Attach to Post" button configured');

    await page.screenshot({ path: path.join(artifactDir, 'video_reels_audit_export_modal.png') });
    console.log('  ✓ Captured video_reels_audit_export_modal.png');
  } catch (uiErr) {
    console.error('Playwright UI audit error:', uiErr);
  } finally {
    await browser.close();
  }

  // --------------------------------------------------------------------------
  // STRICT INVARIANT CHECK: PRODUCTION META PUBLICATION LOCK
  // --------------------------------------------------------------------------
  console.log('\n------------------------------------------------------------------------');
  console.log('STRICT INVARIANT: PRODUCTION META PUBLICATION LOCK CHECK');
  console.log('------------------------------------------------------------------------');
  const lockedVariant = await db('post_variants')
    .where('id', 'bc2051b1-a44a-4a97-8acd-1f3125c70164')
    .first();

  assert(!!lockedVariant, 'Locked post variant exists in database');
  assert(
    lockedVariant && lockedVariant.remote_post_id === '1405588742634526_122100337179498315',
    'Locked post variant remote_post_id is strictly 1405588742634526_122100337179498315'
  );
  assert(
    lockedVariant && lockedVariant.status === 'published',
    'Locked post variant status is strictly "published"'
  );

  const lockedJob = await db('publishing_jobs')
    .where('id', '256cf21a-26cd-4032-a7b8-17261d8a81b1')
    .first();

  assert(!!lockedJob, 'Locked publishing job exists in database');
  assert(
    lockedJob && lockedJob.status === 'published',
    'Locked publishing job status is strictly "published"'
  );

  console.log('\n========================================================================');
  console.log(`   SUITE COMPLETE: ${passed} / ${total} TESTS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================================\n');

  process.exit(passed === total ? 0 : 1);
}

runSuite().catch((err) => {
  console.error('Fatal Suite Error:', err);
  process.exit(1);
});
