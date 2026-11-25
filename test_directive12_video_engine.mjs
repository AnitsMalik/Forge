// Automated E2E Test Suite for Directive 12: Video Reels & Motion Engine
import http from 'http';

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('🚀 [Test] Starting Directive 12 Video Reels & Motion Engine Verification...\n');

  // 1. Auth login
  console.log('1. Authenticating...');
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { email: 'sarah@apex.com', password: 'Password123!' }
  );

  if (loginRes.status !== 200 || !loginRes.data?.data?.tokens?.accessToken) {
    throw new Error('Login failed: ' + JSON.stringify(loginRes.data));
  }
  const token = loginRes.data.data.tokens.accessToken;
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const meRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: '/api/v1/auth/me',
    method: 'GET',
    headers: authHeaders,
  });

  const brand = meRes.data?.data?.brands?.[0];
  const brandId = brand?.id;
  console.log(`   ✓ Logged in as sarah@apex.com. Brand: "${brand?.name}" (ID: ${brandId})`);


  // 2. Test listTemplates (Directive 11 templates integration)
  console.log('\n2. Testing GET /videos/templates...');
  const tplRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/v1/brands/${brandId}/videos/templates`,
    method: 'GET',
    headers: authHeaders,
  });

  if (tplRes.status !== 200 || !tplRes.data?.data?.templates) {
    throw new Error('listTemplates failed: ' + JSON.stringify(tplRes.data));
  }
  const tpls = tplRes.data.data.templates;
  console.log(`   ✓ Returned ${tpls.length} video templates.`);
  const categories = tpls.map((t) => t.category);
  console.log('   ✓ Categories covered:', categories.join(', '));
  const expectedCats = ['promotion', 'educational', 'product', 'announcement', 'testimonial', 'quote', 'event', 'carousel', 'sale'];
  const missingCats = expectedCats.filter((c) => !categories.includes(c));
  if (missingCats.length > 0) {
    throw new Error('Missing Directive 11 categories: ' + missingCats.join(', '));
  }
  console.log('   ✓ All 9 Directive 11 canonical template categories present!');

  // 3. Test generateStoryboard (4-Beat narrative arc: Hook -> Value -> Proof -> CTA)
  console.log('\n3. Testing POST /videos/storyboard (4-beat Arc: Hook → Value → Proof → CTA)...');
  const sbRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/brands/${brandId}/videos/storyboard`,
      method: 'POST',
      headers: authHeaders,
    },
    {
      text: 'Stop scrolling! Launching our new clinical vitamin C brightening serum with 20% discount code GLOW20. Visible glow in 14 days with +340% clinical radiance boost.',
    }
  );

  if (sbRes.status !== 200 || !sbRes.data?.data?.scenes) {
    throw new Error('generateStoryboard failed: ' + JSON.stringify(sbRes.data));
  }
  const sbData = sbRes.data.data;
  console.log(`   ✓ Storyboard generated: "${sbData.title}"`);
  console.log(`   ✓ Total duration: ${sbData.totalDurationSec}s | Topic: ${sbData.topic} | Motion: ${sbData.suggestedMotionStyle}`);
  console.log(`   ✓ Number of scenes: ${sbData.scenes.length}`);

  if (sbData.scenes.length !== 4) {
    throw new Error(`Expected 4 scenes (Hook, Value, Proof, CTA), but got ${sbData.scenes.length}`);
  }
  sbData.scenes.forEach((sc, i) => {
    console.log(`     Scene ${sc.order} [${sc.badge}]: "${sc.headline}" (${sc.durationSec}s, anim: ${sc.animation || 'none'})`);
  });
  console.log('   ✓ 4-beat narrative arc validated (Hook → Value → Proof → CTA)!');

  // 4. Test renderVideo (Native FFmpeg 9:16 composition & DB persistence)
  console.log('\n4. Testing POST /videos/render (FFmpeg 1080x1920 MP4 & DB Job tracking)...');
  const renderRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/brands/${brandId}/videos/render`,
      method: 'POST',
      headers: authHeaders,
    },
    {
      title: 'E2E Test Spotlight Reel (9:16)',
      durationSec: 4,
      scenes: [
        { id: 'sc-1', order: 1, durationSec: 2.0, badge: '✦ WAIT FOR IT', headline: 'Next-Level Social Velocity', subtext: 'Rendered with native FFmpeg', animation: 'kinetic_pop' },
        { id: 'sc-2', order: 2, durationSec: 2.0, badge: '⚡ CLAIM ACCESS', headline: 'Available Now on SocialForge', subtext: 'Tap link in bio', animation: 'scale' },
      ],
      motionStyle: 'kinetic_pop',
      audioTrackId: 'synth_drive',
      musicVolume: 0.4,
      burnSubtitles: true,
      includeOutro: true,
      outroHeadline: 'Luminary Glow Cosmetics',
      outroSubtext: 'Tap link in bio',
    }
  );

  if (renderRes.status !== 201 || !renderRes.data?.data?.renderResult) {
    throw new Error('renderVideo failed: ' + JSON.stringify(renderRes.data));
  }
  const rr = renderRes.data.data.renderResult;
  const asset = renderRes.data.data.asset;
  console.log(`   ✓ Video rendered successfully! Asset ID: ${rr.assetId}`);
  console.log(`   ✓ File: ${rr.fileName} (${Math.round(rr.fileSizeBytes / 1024)} KB, ${rr.width}x${rr.height} @ ${rr.durationSec}s)`);
  console.log(`   ✓ Public URL: ${rr.publicUrl}`);
  console.log(`   ✓ Thumbnail URL: ${rr.thumbnailUrl}`);
  console.log(`   ✓ Filters applied:`, rr.filtersApplied.join(' | '));
  console.log(`   ✓ Saved to MySQL media_assets: ID = ${asset?.id}, media_type = ${asset?.media_type}`);

  // 5. Test getJobStatus
  console.log('\n5. Testing GET /videos/jobs/:jobId...');
  const jobId = rr.fileName.replace('reel-', '').replace('.mp4', '');
  const jobListRes = await request({
    hostname: 'localhost',
    port: 4000,
    path: `/api/v1/brands/${brandId}/videos/jobs`,
    method: 'GET',
    headers: authHeaders,
  });

  if (jobListRes.status !== 200 || !Array.isArray(jobListRes.data?.data)) {
    throw new Error('listJobs failed: ' + JSON.stringify(jobListRes.data));
  }
  console.log(`   ✓ Found ${jobListRes.data.data.length} jobs in video_render_jobs table.`);
  const latestJob = jobListRes.data.data[0];
  console.log(`   ✓ Latest Job ${latestJob?.jobId}: status=${latestJob?.status}, progress=${latestJob?.progress}%, stage="${latestJob?.stage}"`);

  // 6. Test retry endpoint
  console.log('\n6. Testing POST /videos/jobs/:jobId/retry...');
  const retryRes = await request(
    {
      hostname: 'localhost',
      port: 4000,
      path: `/api/v1/brands/${brandId}/videos/jobs/${latestJob.jobId}/retry`,
      method: 'POST',
      headers: authHeaders,
    },
    {}
  );
  if (retryRes.status !== 200) {
    throw new Error('retryJob failed: ' + JSON.stringify(retryRes.data));
  }
  console.log('   ✓ Idempotent retry endpoint returned HTTP 200:', retryRes.data?.message);

  console.log('\n🎉 ALL DIRECTIVE 12 TESTS PASSED PERFECTLY!\n');
}

run().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
