import assert from 'assert';
import { LinkedInAdapter } from '../apps/api/dist/services/adapters/linkedInAdapter.js';
import { XTwitterAdapter } from '../apps/api/dist/services/adapters/xTwitterAdapter.js';
import { TikTokAdapter } from '../apps/api/dist/services/adapters/tiktokAdapter.js';
import { YouTubeShortsAdapter } from '../apps/api/dist/services/adapters/youtubeShortsAdapter.js';
import { ThreadsAdapter } from '../apps/api/dist/services/adapters/threadsAdapter.js';
import { PinterestAdapter } from '../apps/api/dist/services/adapters/pinterestAdapter.js';
import { LinkedInConnector, ThreadsConnector, PinterestConnector } from '../apps/api/dist/connectors/index.js';

console.log('========================================================');
console.log('🧪 VERIFYING HARDENED SOCIAL PLATFORM ADAPTERS');
console.log('========================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Error: ${err.message}`);
    }
  }

  // --- 1. LINKEDIN ADAPTER VERIFICATION ---
  console.log('--- TRACK 1: LinkedIn Adapter Hardening ---');
  const linkedIn = new LinkedInAdapter();

  test('LinkedIn rejects content exceeding 3000 chars', () => {
    const res = linkedIn.validateContent('a'.repeat(3001));
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors[0].includes('3000'));
  });

  await asyncTest('LinkedIn sandbox mode returns simulated share URN', async () => {
    const res = await linkedIn.publish(
      {
        brandId: 'brand-test',
        platform: 'linkedin',
        content: 'B2B Thought Leadership Post #Growth',
      },
      { isSandbox: true }
    );
    assert.strictEqual(res.success, true);
    assert.ok(res.remotePostId.startsWith('urn:li:share:'));
    assert.ok(res.remotePostUrl.includes('linkedin.com/feed/update/'));
  });

  await asyncTest('LinkedIn connector discovery returns sandbox resource when in sandbox mode', async () => {
    const connector = new LinkedInConnector();
    const resources = await connector.discoverResources({
      tenantId: 't-1',
      connectionId: 'c-1',
      brandId: 'b-1',
      credentials: { isSandbox: true },
    });
    assert.ok(Array.isArray(resources));
    assert.strictEqual(resources.length, 1);
    assert.strictEqual(resources[0].resourceType, 'organization');
    assert.strictEqual(resources[0].externalResourceId, 'urn:li:organization:sandbox_preview');
  });

  await asyncTest('LinkedIn adapter fetches metric snapshot with impressions and engagement', async () => {
    const metrics = await linkedIn.fetchMetrics('urn:li:share:1234567890', { isSandbox: true });
    assert.ok(metrics);
    assert.ok(typeof metrics.impressions === 'number' && metrics.impressions > 0);
    assert.ok(typeof metrics.reach === 'number' && metrics.reach > 0);
    assert.ok(typeof metrics.engagementRate === 'number');
  });

  // --- 2. X / TWITTER ADAPTER VERIFICATION ---
  console.log('\n--- TRACK 2: X (Twitter) Adapter Hardening ---');
  const twitter = new XTwitterAdapter();

  test('Twitter rejects content exceeding 280 chars', () => {
    const res = twitter.validateContent('t'.repeat(281));
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors[0].includes('280'));
  });

  await asyncTest('Twitter sandbox mode returns sandbox result safely', async () => {
    const res = await twitter.publish(
      {
        brandId: 'brand-test',
        platform: 'x_twitter',
        content: 'Launching our new feature today! 🚀',
      },
      { isSandbox: true }
    );
    assert.strictEqual(res.success, true);
    assert.ok(res.remotePostId);
  });

  // --- 3. TIKTOK ADAPTER GATING & HONESTY ---
  console.log('\n--- TRACK 3: TikTok Adapter Gating ---');
  const tiktok = new TikTokAdapter();

  await asyncTest('TikTok sandbox mode returns simulated video safely with sandbox flag', async () => {
    const res = await tiktok.publish(
      {
        brandId: 'brand-test',
        platform: 'tiktok',
        content: 'Vertical short reel #trending',
        mediaUrls: ['https://example.com/video.mp4'],
      },
      { isSandbox: true, accountName: 'testbrand' }
    );
    assert.strictEqual(res.success, true);
    assert.ok(res.remotePostUrl.includes('tiktok.com/@testbrand/video/'));
  });

  await asyncTest('TikTok blocks live uncertified publishing attempts without faking success', async () => {
    const res = await tiktok.publish(
      {
        brandId: 'brand-test',
        platform: 'tiktok',
        content: 'Live attempt without partner cert',
        mediaUrls: ['https://example.com/video.mp4'],
      },
      { accessToken: 'fake_live_token', isSandbox: false }
    );
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.httpStatus, 501);
    assert.ok(res.errorMessage.includes('Enterprise Partner'));
    assert.strictEqual(res.remotePostId, '');
  });

  // --- 4. YOUTUBE SHORTS ADAPTER GATING ---
  console.log('\n--- TRACK 4: YouTube Shorts Adapter Gating ---');
  const youtube = new YouTubeShortsAdapter();

  test('YouTube Shorts rejects posts with missing video URL', () => {
    const res = youtube.validateContent('Text without video', []);
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors[0].includes('video asset URL'));
  });

  await asyncTest('YouTube Shorts sandbox mode returns sandbox response safely', async () => {
    const res = await youtube.publish(
      {
        brandId: 'brand-test',
        platform: 'youtube',
        content: 'Shorts description #Shorts',
        mediaUrls: ['https://example.com/vertical.mp4'],
      },
      { isSandbox: true }
    );
    assert.strictEqual(res.success, true);
    assert.ok(res.remotePostUrl.includes('youtube.com/shorts/'));
  });

  // --- 5. THREADS ADAPTER VERIFICATION ---
  console.log('\n--- TRACK 5: Threads Adapter (Meta) ---');
  const threads = new ThreadsAdapter();

  test('Threads rejects content exceeding 500 chars', () => {
    const res = threads.validateContent('a'.repeat(501));
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors[0].includes('500'));
  });

  await asyncTest('Threads sandbox mode returns simulated threads post URL', async () => {
    const res = await threads.publish(
      {
        brandId: 'brand-test',
        platform: 'threads',
        content: 'Hello Threads from SocialForge!',
      },
      { isSandbox: true }
    );
    assert.strictEqual(res.success, true);
    assert.ok(res.remotePostUrl.includes('threads.net') || res.remotePostId.length > 0);
  });

  await asyncTest('Threads connector discovers threads_profile resource', async () => {
    const connector = new ThreadsConnector();
    const resources = await connector.discoverResources({
      tenantId: 'tenant-test',
      connectionId: 'conn-threads-test',
      brandId: 'brand-test',
      credentials: { accountName: '@socialforge' },
    });
    assert.ok(resources.length >= 1);
    assert.strictEqual(resources[0].resourceType, 'threads_profile');
  });

  // --- 6. PINTEREST ADAPTER VERIFICATION ---
  console.log('\n--- TRACK 6: Pinterest Pins Adapter ---');
  const pinterest = new PinterestAdapter();

  test('Pinterest rejects content exceeding 500 chars', () => {
    const res = pinterest.validateContent('a'.repeat(501));
    assert.strictEqual(res.valid, false);
    assert.ok(res.errors[0].includes('500'));
  });

  await asyncTest('Pinterest sandbox mode returns simulated pin URL', async () => {
    const res = await pinterest.publish(
      {
        brandId: 'brand-test',
        platform: 'pinterest',
        content: 'Check out our new visual creative workspace!',
        mediaUrls: ['https://example.com/banner.jpg'],
      },
      { isSandbox: true }
    );
    assert.strictEqual(res.success, true);
    assert.ok(res.remotePostUrl.includes('pinterest') && res.remotePostUrl.includes('pin'));
  });

  await asyncTest('Pinterest connector discovers board resource', async () => {
    const connector = new PinterestConnector();
    const resources = await connector.discoverResources({
      tenantId: 'tenant-test',
      connectionId: 'conn-pin-test',
      brandId: 'brand-test',
      credentials: { accountName: 'SocialForge Boards' },
    });
    assert.ok(resources.length >= 1);
    assert.strictEqual(resources[0].resourceType, 'board');
  });

  console.log('\n========================================================');
  console.log(`TEST SUMMARY: ${passed} / ${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('========================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

