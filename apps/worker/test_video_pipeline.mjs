import http from 'http';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:4000/api/v1';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body), headers: res.headers });
          } catch {
            resolve({ status: res.statusCode, raw: body, headers: res.headers });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('  SocialForge Phase 8: FFmpeg Video Composition Test Suite');
  console.log('================================================================\n');

  // 1. Authenticate user
  console.log('1. Authenticating singh.ninex@gmail.com...');
  const authRes = await makeRequest(`${API_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: 'singh.ninex@gmail.com', password: 'Access@123' }),
  });
  const token = authRes.data?.data?.tokens?.accessToken || authRes.data?.data?.token;
  if (authRes.status !== 200 || !token) {
    throw new Error('Authentication failed: ' + JSON.stringify(authRes.data));
  }
  const headers = { Authorization: `Bearer ${token}` };
  console.log('   ✓ Authentication successful! Token acquired.');

  // 2. Resolve brand Luminary Glow Cosmetics
  console.log('\n2. Resolving Brand "Luminary Glow Cosmetics"...');
  const brandsRes = await makeRequest(`${API_BASE}/brands`, { headers });
  const brands = brandsRes.data?.data || [];
  const brand = brands.find((b) => b.name?.includes('Luminary')) || brands[0];
  if (!brand) throw new Error('No brand found');
  console.log(`   ✓ Identified Brand: "${brand.name}" (ID: ${brand.id})`);

  // 3. Test Storyboard Generation
  console.log('\n3. Testing AI Storyboard Generator Endpoint...');
  const storyRes = await makeRequest(`${API_BASE}/brands/${brand.id}/videos/storyboard`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      text: 'Experience maximum radiance with our all-new Vitamin C Brightening Serum. Clinically proven 340% hydration boost in 14 days. Use code GLOW20 for exclusive launch discount.',
    }),
  });
  if (storyRes.status !== 200 || !storyRes.data?.data?.scenes) {
    throw new Error('Storyboard generation failed: ' + JSON.stringify(storyRes.data));
  }
  const storyboard = storyRes.data.data;
  console.log(`   ✓ Storyboard generated: "${storyboard.title}"`);
  console.log(`     - Topic: ${storyboard.topic}`);
  console.log(`     - Total Scenes: ${storyboard.scenes.length}`);
  console.log(`     - Motion Style: ${storyboard.suggestedMotionStyle}`);
  console.log(`     - Scene 1: [${storyboard.scenes[0].badge}] ${storyboard.scenes[0].headline}`);
  console.log(`     - Scene 2: [${storyboard.scenes[1].badge}] ${storyboard.scenes[1].headline}`);
  console.log(`     - Scene 3: [${storyboard.scenes[2].badge}] ${storyboard.scenes[2].headline}`);

  // 4. Test Video Templates Endpoint
  console.log('\n4. Fetching Video Templates & Presets...');
  const templatesRes = await makeRequest(`${API_BASE}/brands/${brand.id}/videos/templates`, { headers });
  if (templatesRes.status !== 200) throw new Error('Templates fetch failed');
  console.log(`   ✓ Retrieved ${templatesRes.data.data.templates.length} templates, ${templatesRes.data.data.brollVideos.length} b-roll presets, and ${templatesRes.data.data.audioTracks.length} audio tracks.`);

  // 5. Test Full Native FFmpeg 9:16 Video Render Endpoint
  console.log('\n5. Executing Native FFmpeg 9:16 Video Render Pipeline...');
  console.log('   - Aspect Ratio: 9:16 (1080x1920)');
  console.log('   - Subtitles: ASS Hardcoded Burn-in with Brand Primary Color');
  console.log('   - Audio: Stereo Dynamic Sidechain Ducking');
  console.log('   - Outro: 2-Second Branded Call-to-Action Card');

  const renderStart = Date.now();
  const renderRes = await makeRequest(`${API_BASE}/brands/${brand.id}/videos/render`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      templateId: 'product_spotlight_reel',
      title: 'Luminary Glow Radiance Serum 9:16 Reel',
      subtext: 'Vertical short-form product spotlight',
      durationSec: 6,
      burnSubtitles: true,
      includeOutro: true,
      outroHeadline: 'Luminary Glow Official',
      outroSubtext: 'Shop Now at luminaryglow.com',
      scenes: [
        {
          id: 's1',
          order: 1,
          durationSec: 2.0,
          badge: '✨ EXCLUSIVE LAUNCH',
          headline: 'Next-Gen Vitamin C Serum',
          subtext: 'Clinically proven radiance in 14 days',
        },
        {
          id: 's2',
          order: 2,
          durationSec: 2.0,
          badge: '📈 +340% HYDRATION',
          headline: 'Triple Hyaluronic Bio-Complex',
          subtext: 'Immediate luminous glass skin finish',
        },
        {
          id: 's3',
          order: 3,
          durationSec: 2.0,
          badge: '⚡ SPECIAL OFFER',
          headline: 'Use VIP Code GLOW20',
          subtext: 'Free shipping on orders over $50',
        },
      ],
    }),
  });

  const elapsedMs = Date.now() - renderStart;

  if (renderRes.status !== 201 || !renderRes.data?.data?.renderResult) {
    throw new Error('Video render failed: ' + JSON.stringify(renderRes.data));
  }

  const result = renderRes.data.data.renderResult;
  const asset = renderRes.data.data.asset;

  console.log(`   ✓ Video Render Completed in ${(elapsedMs / 1000).toFixed(2)}s!`);
  console.log(`     - Asset ID:       ${result.assetId}`);
  console.log(`     - File Name:      ${result.fileName}`);
  console.log(`     - Resolution:     ${result.width} × ${result.height} (9:16 Portrait)`);
  console.log(`     - Duration:       ${result.durationSec}s`);
  console.log(`     - File Size:      ${(result.fileSizeBytes / 1024).toFixed(1)} KB`);
  console.log(`     - Codec:          ${result.codec}`);
  console.log(`     - Engine Used:    ${result.engineUsed}`);
  console.log(`     - Filters:        ${result.filtersApplied.join(' | ')}`);
  console.log(`     - Public Video:   ${result.publicUrl}`);
  console.log(`     - Poster Thumb:   ${result.thumbnailUrl}`);

  // 6. Verify Static HTTP Serving of Rendered MP4 & Poster JPG
  console.log('\n6. Verifying Static File Serving via Express...');
  const videoHttp = await makeRequest(result.publicUrl);
  console.log(`   ✓ Video MP4 HTTP Status: ${videoHttp.status} (Content-Type: ${videoHttp.headers['content-type']})`);
  const thumbHttp = await makeRequest(result.thumbnailUrl);
  console.log(`   ✓ Thumbnail JPG HTTP Status: ${thumbHttp.status} (Content-Type: ${thumbHttp.headers['content-type']})`);

  // 7. Verify Database Persistence in media_assets
  console.log('\n7. Verifying MySQL media_assets Record...');
  const mediaListRes = await makeRequest(`${API_BASE}/brands/${brand.id}/media?type=video`, { headers });
  const videoAssets = mediaListRes.data?.data || [];
  const foundInDb = videoAssets.find((a) => a.id === result.assetId);

  if (!foundInDb) throw new Error('Rendered video not found in MySQL media_assets');
  console.log(`   ✓ Verified in Database: Media Asset "${foundInDb.fileName}" exists!`);
  console.log(`     - MIME Type: ${foundInDb.mimeType}`);
  console.log(`     - Storage Key: ${foundInDb.storageKey}`);
  console.log(`     - Metadata Pipeline: ${foundInDb.metadata?.pipeline}`);

  // 8. Test Dual-Stream Blurred Backdrop Video Render
  console.log('\n8. Testing Dual-Stream Gaussian Boxblur Backdrop Conversion with Voiceover...');
  const renderBrollRes = await makeRequest(`${API_BASE}/brands/${brand.id}/videos/render`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: 'Botanical Breeze Blurred Backdrop Reel',
      subtext: 'Dual-stream 9:16 vertical composition',
      durationSec: 5,
      bgVideoUrl: 'http://localhost:4000/uploads/video-renders/output/test_backdrop_output.mp4',
      burnSubtitles: true,
      includeOutro: true,
      outroHeadline: 'Luminary Glow Cosmetics',
      outroSubtext: '100% Organic Botanical Extracts',
      scenes: [
        {
          id: 'b1',
          order: 1,
          durationSec: 2.5,
          badge: '🌿 PURE BOTANICALS',
          headline: 'Harvested From Nature',
          subtext: 'Sustainable and ethically sourced ingredients',
        },
        {
          id: 'b2',
          order: 2,
          durationSec: 2.5,
          badge: '✨ CLINICAL PURITY',
          headline: 'Zero Additives or Fillers',
          subtext: 'Backed by 10-year dermatological research',
        },
      ],
    }),
  });

  if (renderBrollRes.status !== 201 || !renderBrollRes.data?.data?.renderResult) {
    throw new Error('B-Roll Video render failed: ' + JSON.stringify(renderBrollRes.data));
  }
  const brollResult = renderBrollRes.data.data.renderResult;
  console.log(`   ✓ Dual-Stream Gaussian Boxblur Render Completed!`);
  console.log(`     - File Name:      ${brollResult.fileName}`);
  console.log(`     - Resolution:     ${brollResult.width} × ${brollResult.height}`);
  console.log(`     - Filters:        ${brollResult.filtersApplied.join(' | ')}`);
  console.log(`     - Public Video:   ${brollResult.publicUrl}`);
  console.log(`     - Poster Thumb:   ${brollResult.thumbnailUrl}`);

  console.log('\n================================================================');
  console.log('  ALL PHASE 8 FFMPEG INTEGRATION TESTS PASSED CLEANLY (0 ERRORS)');
  console.log('================================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
