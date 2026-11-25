import http from 'http';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../apps/api/dist/db/connection.js';
import { config } from '../apps/api/dist/config/index.js';
import { socialAdapterRegistry } from '../apps/api/dist/services/adapters/adapterRegistry.js';
import { BaseSocialAdapter } from '../apps/api/dist/services/adapters/socialPlatformAdapter.js';
import { executePublishPost } from '../apps/api/dist/controllers/post.controller.js';
import { UsageTrackerService } from '../apps/api/dist/services/usageTracker.service.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Controllable Test Social Adapter for metering verification
 */
class ControllableTestAdapter extends BaseSocialAdapter {
  platformId = 'linkedin';
  platformName = 'Test Production Adapter';
  maxCharacters = 3000;
  supportsImages = true;
  supportsVideos = true;

  mode = 'real_success'; // 'real_success' | 'failure' | 'sandbox'
  publishCallCount = 0;

  constructor(platform = 'linkedin') {
    super();
    this.platformId = platform;
    this.platformName = `Test ${platform} Adapter`;
  }

  setMode(mode) {
    this.mode = mode;
  }

  async publish(payload, credentials) {
    this.publishCallCount++;

    if (this.mode === 'failure') {
      return {
        success: false,
        remotePostId: '',
        remotePostUrl: '',
        httpStatus: 400,
        platform: payload.platform,
        rawResponse: { error: 'Network timeout during provider publish call' },
        errorMessage: 'Network timeout during provider publish call',
      };
    }

    if (this.mode === 'sandbox') {
      return {
        success: true,
        remotePostId: `mock_${payload.platform}_${Date.now()}`,
        remotePostUrl: `https://mock.socialforge.io/p/${Date.now()}`,
        httpStatus: 200,
        platform: payload.platform,
        rawResponse: { simulated: true, isSandbox: true },
      };
    }

    // Real production confirmed publication
    const extId = `urn:li:share:${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
    return {
      success: true,
      remotePostId: extId,
      remotePostUrl: `https://www.linkedin.com/feed/update/${extId}`,
      httpStatus: 200,
      platform: payload.platform,
      rawResponse: { id: extId, confirmed: true },
    };
  }

  async fetchMetrics() {
    return {
      impressions: 120,
      reach: 100,
      likes: 15,
      comments: 3,
      shares: 2,
      clicks: 10,
      videoViews: 0,
      engagementRate: 2.5,
    };
  }
}

async function insertVariant(data) {
  return db('post_variants').insert({
    id: data.id || crypto.randomUUID(),
    post_id: data.post_id,
    platform: data.platform,
    content: data.content,
    media_asset_ids: JSON.stringify(data.media_asset_ids || []),
    platform_specific_config: JSON.stringify(data.platform_specific_config || {}),
    status: data.status || 'pending',
    created_at: new Date(),
    updated_at: new Date(),
  });
}

async function run() {
  console.log('========================================================================');
  console.log('STAGE 6: SAAS USAGE METERING & ATOMIC QUOTA TRACKING SUITE');
  console.log('========================================================================\n');

  // Register controllable adapters
  const testLinkedInAdapter = new ControllableTestAdapter('linkedin');
  const testTwitterAdapter = new ControllableTestAdapter('x_twitter');
  socialAdapterRegistry.registerAdapter('linkedin', testLinkedInAdapter);
  socialAdapterRegistry.registerAdapter('x_twitter', testTwitterAdapter);

  const tenantAId = crypto.randomUUID();
  const tenantBId = crypto.randomUUID();
  const userAId = crypto.randomUUID();
  const userBId = crypto.randomUUID();
  const brandAId = crypto.randomUUID();
  const brandBId = crypto.randomUUID();

  const periodMonth = UsageTrackerService.getCurrentPeriodMonth();

  try {
    // -------------------------------------------------------------------------
    // Setup Isolated Tenants & Workspaces
    // -------------------------------------------------------------------------
    console.log('[Setup] Provisioning Tenant A (Starter Plan) & Tenant B (Growth Plan)...');

    // Tenant A (Starter: 100 posts/month, 1 brand, 3 social accounts, 2 users)
    await db('tenants').insert({
      id: tenantAId,
      name: 'Tenant A Alpha Media',
      slug: `tenant-a-${Date.now()}`,
      settings: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('users').insert({
      id: userAId,
      email: `user-a-${Date.now()}@alpha.com`,
      password_hash: 'hash',
      full_name: 'Alpha Admin',
      is_superadmin: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('tenant_users').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantAId,
      user_id: userAId,
      role: 'owner',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('tenant_subscriptions').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantAId,
      plan_id: 'starter',
      status: 'active',
      provider: 'stripe',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancel_at_period_end: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('brands').insert({
      id: brandAId,
      tenant_id: tenantAId,
      name: 'Alpha Brand',
      slug: `alpha-brand-${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('social_accounts').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantAId,
      brand_id: brandAId,
      platform: 'linkedin',
      account_id: 'linkedin-alpha-001',
      account_name: 'Alpha LinkedIn Org',
      access_token_encrypted: 'token_alpha_linkedin_secret',
      metadata: JSON.stringify({ isSandbox: false }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('social_accounts').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantAId,
      brand_id: brandAId,
      platform: 'x_twitter',
      account_id: 'twitter-alpha-001',
      account_name: 'Alpha Twitter Handle',
      access_token_encrypted: 'token_alpha_twitter_secret',
      metadata: JSON.stringify({ isSandbox: false }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Tenant B (Growth: 500 posts/month, 5 brands, 15 social accounts, 6 users)
    await db('tenants').insert({
      id: tenantBId,
      name: 'Tenant B Beta Studio',
      slug: `tenant-b-${Date.now()}`,
      settings: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('users').insert({
      id: userBId,
      email: `user-b-${Date.now()}@beta.com`,
      password_hash: 'hash',
      full_name: 'Beta Admin',
      is_superadmin: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('tenant_users').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantBId,
      user_id: userBId,
      role: 'owner',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('tenant_subscriptions').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantBId,
      plan_id: 'growth',
      status: 'active',
      provider: 'stripe',
      current_period_start: new Date(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      cancel_at_period_end: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('brands').insert({
      id: brandBId,
      tenant_id: tenantBId,
      name: 'Beta Brand',
      slug: `beta-brand-${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('social_accounts').insert({
      id: crypto.randomUUID(),
      tenant_id: tenantBId,
      brand_id: brandBId,
      platform: 'linkedin',
      account_id: 'linkedin-beta-001',
      account_name: 'Beta LinkedIn Org',
      access_token_encrypted: 'token_beta_linkedin_secret',
      metadata: JSON.stringify({ isSandbox: false }),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const jwtSecret = config.jwtSecret;
    const tokenA = jwt.sign(
      { userId: userAId, email: 'user-a@alpha.com', role: 'owner', tenantId: tenantAId },
      jwtSecret,
      { expiresIn: '1h' }
    );
    const tokenB = jwt.sign(
      { userId: userBId, email: 'user-b@beta.com', role: 'owner', tenantId: tenantBId },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 1: GET /api/v1/billing/usage API Contract
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 1: GET /api/v1/billing/usage API Contract ---');

    // 1.1 Unauthorized request rejection
    const unauthRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/billing/usage',
      method: 'GET',
    });
    assert(unauthRes.status === 401, 'Rejects unauthenticated request with 401');

    // 1.2 Initial usage endpoint response shape for Tenant A
    const initialUsageRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/billing/usage',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    assert(initialUsageRes.status === 200, 'Returns HTTP 200 for authenticated tenant');
    const uData = initialUsageRes.body?.data;
    assert(uData !== undefined, 'Returns usage data payload');
    assert(uData.period === periodMonth, `Returns current period (${periodMonth})`);
    assert(uData.used === 0, 'Initial posts published used is 0');
    assert(uData.limit === 100, 'Starter plan limit is 100 posts/month');
    assert(uData.remaining === 100, 'Remaining quota is 100');
    assert(uData.percentage === 0, 'Percentage is 0.00%');

    // Verify all 7 tracked dimensions in metrics
    const metrics = uData.metrics;
    assert(metrics.postsPublished !== undefined, 'Tracks postsPublished metric');
    assert(metrics.aiUsage !== undefined, 'Tracks aiUsage metric');
    assert(metrics.videoRendering !== undefined, 'Tracks videoRendering metric');
    assert(metrics.storage !== undefined, 'Tracks storage metric');
    assert(metrics.users !== undefined, 'Tracks users metric');
    assert(metrics.brands !== undefined, 'Tracks brands metric');
    assert(metrics.socialAccounts !== undefined, 'Tracks socialAccounts metric');

    assert(metrics.users.used === 1 && metrics.users.limit === 2, 'Tracks users (1/2 seats)');
    assert(metrics.brands.used === 1 && metrics.brands.limit === 1, 'Tracks brands (1/1 brand)');
    assert(metrics.socialAccounts.used === 2 && metrics.socialAccounts.limit === 3, 'Tracks social accounts (2/3 accounts)');

    // -------------------------------------------------------------------------
    // TEST SECTION 2: Successful Production Publish Quota Consumption
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 2: Successful Production Publish Quota Consumption ---');

    testLinkedInAdapter.setMode('real_success');

    // Create post 1 for Tenant A
    const post1Id = crypto.randomUUID();
    await db('posts').insert({
      id: post1Id,
      tenant_id: tenantAId,
      brand_id: brandAId,
      author_id: userAId,
      title: 'Real Launch Post',
      base_content: 'Launching our brand new commercial SaaS platform live!',
      status: 'draft',
      quota_counted: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const v1Id = crypto.randomUUID();
    await insertVariant({
      id: v1Id,
      post_id: post1Id,
      platform: 'linkedin',
      content: 'Launching our brand new commercial SaaS platform live!',
    });

    // Verify draft does NOT consume quota
    let countersRow = await db('tenant_usage_counters')
      .where({ tenant_id: tenantAId, period_month: periodMonth })
      .first();
    assert(!countersRow || Number(countersRow.posts_published || 0) === 0, 'Draft post does NOT consume publishing quota');

    // Execute real production publish
    const pubResult1 = await executePublishPost(post1Id, brandAId, tenantAId);
    assert(pubResult1.success === true, 'Post 1 published successfully');
    assert(pubResult1.status === 'published', 'Post status updated to "published"');

    // Verify atomic quota consumption
    const post1Db = await db('posts').where({ id: post1Id }).first();
    assert(Boolean(post1Db.quota_counted) === true, 'Post quota_counted atomically locked to true');

    countersRow = await db('tenant_usage_counters')
      .where({ tenant_id: tenantAId, period_month: periodMonth })
      .first();
    assert(Number(countersRow.posts_published) === 1, 'Atomic counter posts_published incremented to 1');

    // Verify GET /api/v1/billing/usage reflects 1 post used
    const afterPubRes = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/billing/usage',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(afterPubRes.body.data.used === 1, 'API usage reflects used = 1');
    assert(afterPubRes.body.data.remaining === 99, 'API usage reflects remaining = 99');
    assert(afterPubRes.body.data.percentage === 1, 'API usage reflects percentage = 1.00%');

    // -------------------------------------------------------------------------
    // TEST SECTION 3: Failed Publish Does NOT Consume Quota
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 3: Failed Publish Does NOT Consume Quota ---');

    testLinkedInAdapter.setMode('failure');

    const postFailId = crypto.randomUUID();
    await db('posts').insert({
      id: postFailId,
      tenant_id: tenantAId,
      brand_id: brandAId,
      author_id: userAId,
      title: 'Failing Post',
      base_content: 'This post will fail at the adapter level',
      status: 'draft',
      quota_counted: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await insertVariant({
      post_id: postFailId,
      platform: 'linkedin',
      content: 'This post will fail at the adapter level',
    });

    const pubFailResult = await executePublishPost(postFailId, brandAId, tenantAId);
    assert(pubFailResult.success === false, 'Publish execution failed as expected');
    assert(pubFailResult.status === 'failed', 'Post status updated to "failed"');

    const postFailDb = await db('posts').where({ id: postFailId }).first();
    assert(Boolean(postFailDb.quota_counted) === false, 'Failed post quota_counted remains false');

    countersRow = await db('tenant_usage_counters')
      .where({ tenant_id: tenantAId, period_month: periodMonth })
      .first();
    assert(Number(countersRow.posts_published) === 1, 'posts_published counter is NOT incremented (remains 1)');

    // -------------------------------------------------------------------------
    // TEST SECTION 4: Retry Deduplication (No Double Counting)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 4: Retry Deduplication (No Double Counting) ---');

    testLinkedInAdapter.setMode('real_success');

    // Retry post 1 with force: true
    const retryResult = await executePublishPost(post1Id, brandAId, tenantAId, { force: true });
    assert(retryResult.success === true, 'Retry executed successfully');

    countersRow = await db('tenant_usage_counters')
      .where({ tenant_id: tenantAId, period_month: periodMonth })
      .first();
    assert(Number(countersRow.posts_published) === 1, 'Retry did NOT double count! posts_published remains exactly 1');

    // -------------------------------------------------------------------------
    // TEST SECTION 5: Duplicate Publish Idempotency
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 5: Duplicate Publish Idempotency ---');

    // Duplicate publish call without force
    const dupResult = await executePublishPost(post1Id, brandAId, tenantAId);
    assert(dupResult.idempotent === true, 'Duplicate publish caught by idempotency guard');

    countersRow = await db('tenant_usage_counters')
      .where({ tenant_id: tenantAId, period_month: periodMonth })
      .first();
    assert(Number(countersRow.posts_published) === 1, 'Duplicate publish did NOT increment counter');

    // -------------------------------------------------------------------------
    // TEST SECTION 6: Sandbox / Mock Publishing Does NOT Consume Quota
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 6: Sandbox / Mock Publishing Does NOT Consume Quota ---');

    testLinkedInAdapter.setMode('sandbox');

    const postSandboxId = crypto.randomUUID();
    await db('posts').insert({
      id: postSandboxId,
      tenant_id: tenantAId,
      brand_id: brandAId,
      author_id: userAId,
      title: 'Sandbox Simulation Post',
      base_content: 'Testing sandbox simulation mode',
      status: 'draft',
      quota_counted: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await insertVariant({
      post_id: postSandboxId,
      platform: 'linkedin',
      content: 'Testing sandbox simulation mode',
    });

    const pubSandboxResult = await executePublishPost(postSandboxId, brandAId, tenantAId);
    assert(pubSandboxResult.status === 'sandbox', 'Post status classified as "sandbox"');

    const postSandboxDb = await db('posts').where({ id: postSandboxId }).first();
    assert(Boolean(postSandboxDb.quota_counted) === false, 'Sandbox post quota_counted remains false');

    countersRow = await db('tenant_usage_counters')
      .where({ tenant_id: tenantAId, period_month: periodMonth })
      .first();
    assert(Number(countersRow.posts_published) === 1, 'Sandbox publishing did NOT increment quota (remains 1)');

    // -------------------------------------------------------------------------
    // TEST SECTION 7: Multi-Platform Publishing Atomic Increment (1 Post, Multiple Channels)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 7: Multi-Platform Publishing Atomic Increment ---');

    testLinkedInAdapter.setMode('real_success');
    testTwitterAdapter.setMode('real_success');

    const postMultiId = crypto.randomUUID();
    await db('posts').insert({
      id: postMultiId,
      tenant_id: tenantAId,
      brand_id: brandAId,
      author_id: userAId,
      title: 'Multi-Channel Campaign Launch',
      base_content: 'Multi-platform live release on LinkedIn and X/Twitter',
      status: 'draft',
      quota_counted: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // 2 variants on same post: LinkedIn + Twitter
    await insertVariant({
      post_id: postMultiId,
      platform: 'linkedin',
      content: 'Multi-platform live release on LinkedIn',
    });
    await insertVariant({
      post_id: postMultiId,
      platform: 'x_twitter',
      content: 'Multi-platform live release on Twitter',
    });

    const pubMultiResult = await executePublishPost(postMultiId, brandAId, tenantAId);
    assert(pubMultiResult.success === true, 'Multi-platform post published successfully');
    assert(pubMultiResult.status === 'published', 'Multi-platform post status is "published"');

    countersRow = await db('tenant_usage_counters')
      .where({ tenant_id: tenantAId, period_month: periodMonth })
      .first();
    assert(
      Number(countersRow.posts_published) === 2,
      `Multi-platform post atomically incremented by exactly 1 post (counter is 2, not 3)`
    );

    // -------------------------------------------------------------------------
    // TEST SECTION 8: Strict Tenant Isolation
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 8: Strict Tenant Isolation ---');

    // Check Tenant B initial usage
    const usageBInitial = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/billing/usage',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    });

    assert(usageBInitial.body.data.used === 0, 'Tenant B used posts is completely 0 (unaffected by Tenant A)');
    assert(usageBInitial.body.data.limit === 500, 'Tenant B has Growth limit (500 posts)');
    assert(usageBInitial.body.data.remaining === 500, 'Tenant B has full 500 remaining');

    // Publish post for Tenant B
    testLinkedInAdapter.setMode('real_success');
    const postBId = crypto.randomUUID();
    await db('posts').insert({
      id: postBId,
      tenant_id: tenantBId,
      brand_id: brandBId,
      author_id: userBId,
      title: 'Tenant B Exclusive Post',
      base_content: 'Exclusive post from Tenant B workspace',
      status: 'draft',
      quota_counted: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await insertVariant({
      post_id: postBId,
      platform: 'linkedin',
      content: 'Exclusive post from Tenant B workspace',
    });

    const pubBResult = await executePublishPost(postBId, brandBId, tenantBId);
    assert(pubBResult.success === true, 'Tenant B post published successfully');

    // Check Tenant B usage after publish
    const usageBAfter = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/billing/usage',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(usageBAfter.body.data.used === 1, 'Tenant B used is now 1');
    assert(usageBAfter.body.data.remaining === 499, 'Tenant B remaining is 499');

    // Check Tenant A usage to ensure Tenant B did not affect Tenant A
    const usageAAfter = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/billing/usage',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(usageAAfter.body.data.used === 2, 'Tenant A used remains strictly at 2 (unaffected by Tenant B)');

    // -------------------------------------------------------------------------
    // TEST SECTION 9: AI, Video, and Storage Metering Dimensions
    // -------------------------------------------------------------------------
    console.log('\n--- TEST SECTION 9: AI, Video, and Storage Metering Dimensions ---');

    // Atomically record AI tokens and video seconds
    await UsageTrackerService.recordUsage(tenantAId, 'ai_tokens_consumed', 15000);
    await UsageTrackerService.recordUsage(tenantAId, 'video_render_seconds', 45);

    // Insert media asset to verify dynamic storage metering
    const assetId = crypto.randomUUID();
    await db('media_assets').insert({
      id: assetId,
      tenant_id: tenantAId,
      brand_id: brandAId,
      storage_key: 'uploads/test-image.jpg',
      public_url: 'https://cdn.socialforge.io/test-image.jpg',
      file_name: 'test-image.jpg',
      mime_type: 'image/jpeg',
      file_size_bytes: 25000000, // 25 MB
      media_type: 'image',
      metadata: JSON.stringify({ width: 1200, height: 800 }),
      created_at: new Date(),
    });

    const finalUsageA = await request({
      hostname: 'localhost',
      port: 4000,
      path: '/api/v1/billing/usage',
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const finalM = finalUsageA.body.data.metrics;
    assert(finalM.aiUsage.used === 15000, 'AI usage consumed 15,000 tokens');
    assert(finalM.aiUsage.limit === 100000, 'Starter AI limit is 100,000 tokens');
    assert(finalM.aiUsage.remaining === 85000, 'AI remaining is 85,000 tokens');
    assert(finalM.aiUsage.percentage === 15, 'AI usage is 15.00%');

    assert(finalM.videoRendering.used === 45, 'Video rendering consumed 45 seconds');
    assert(finalM.videoRendering.limit === 300, 'Starter video limit is 300 seconds');
    assert(finalM.videoRendering.remaining === 255, 'Video remaining is 255 seconds');
    assert(finalM.videoRendering.percentage === 15, 'Video rendering is 15.00%');

    assert(finalM.storage.used >= 25000000, 'Storage accurately calculates 25MB from media assets');
    assert(finalM.storage.limit === 5368709120, 'Starter storage limit is 5 GB (5,368,709,120 bytes)');
    assert(finalM.storage.remaining > 0, 'Storage remaining calculated');

  } catch (err) {
    console.error('Unexpected error during test execution:', err);
    failed++;
  } finally {
    // Cleanup test artifacts
    await db('publish_logs').whereIn('post_variant_id', function() {
      this.select('id').from('post_variants').whereIn('post_id', function() {
        this.select('id').from('posts').whereIn('tenant_id', [tenantAId, tenantBId]);
      });
    }).delete();
    await db('analytics_metrics').whereIn('post_variant_id', function() {
      this.select('id').from('post_variants').whereIn('post_id', function() {
        this.select('id').from('posts').whereIn('tenant_id', [tenantAId, tenantBId]);
      });
    }).delete();
    await db('media_assets').whereIn('tenant_id', [tenantAId, tenantBId]).delete();
    await db('post_variants').whereIn('post_id', function() {
      this.select('id').from('posts').whereIn('tenant_id', [tenantAId, tenantBId]);
    }).delete();
    await db('posts').whereIn('tenant_id', [tenantAId, tenantBId]).delete();
    await db('social_accounts').whereIn('tenant_id', [tenantAId, tenantBId]).delete();
    await db('brands').whereIn('tenant_id', [tenantAId, tenantBId]).delete();
    await db('tenant_usage_counters').whereIn('tenant_id', [tenantAId, tenantBId]).delete();
    await db('tenant_subscriptions').whereIn('tenant_id', [tenantAId, tenantBId]).delete();
    await db('tenant_users').whereIn('tenant_id', [tenantAId, tenantBId]).delete();
    await db('users').whereIn('id', [userAId, userBId]).delete();
    await db('tenants').whereIn('id', [tenantAId, tenantBId]).delete();

    await db.destroy();
  }

  console.log('\n========================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
