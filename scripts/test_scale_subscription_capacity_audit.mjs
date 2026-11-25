/**
 * SocialForge — Scale Subscription Limit & Architectural Capacity Audit Suite
 *
 * Exhaustively evaluates whether the existing SocialForge application can reliably
 * support the advertised Scale subscription limits:
 * - 100 brands per organization
 * - 50 team seats per organization
 * - 250 connected social accounts per organization
 * - 10,000 posts per month per organization
 * - 200 automation rules per organization
 * - 500 GB of media storage per organization
 */

import { db } from '../apps/api/dist/db/connection.js';
import { EntitlementService } from '../apps/api/dist/services/entitlement.service.js';
import { planGuardService, PlanGuardError } from '../apps/api/dist/services/billing/planGuard.service.js';
import { UsageTrackerService } from '../apps/api/dist/services/usageTracker.service.js';
import crypto from 'crypto';

let passCount = 0;
let failCount = 0;
const auditFindings = [];
const benchmarkResults = {};

function assert(condition, message, meta) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
    if (meta) console.error(`     Details:`, meta);
  }
}

function calculatePercentiles(latencies) {
  if (!latencies || latencies.length === 0) return { p50: 0, p95: 0, p99: 0, min: 0, max: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const avg = (sorted.reduce((acc, v) => acc + v, 0) / sorted.length).toFixed(2);
  return { p50, p95, p99, min, max, avg: Number(avg) };
}

async function main() {
  console.log('========================================================================');
  console.log('   SOCIALFORGE: SCALE SUBSCRIPTION ARCHITECTURAL CAPACITY AUDIT       ');
  console.log('   100 Brands • 50 Seats • 250 Accounts • 10k Posts • 200 Rules • 500GB ');
  console.log('========================================================================\n');

  // Verify pre-flight Meta publication lock invariant
  const preMetaVariant = await db('post_variants')
    .where({ remote_post_id: '1405588742634526_122100337179498315' })
    .first();
  assert(
    preMetaVariant && preMetaVariant.status === 'published',
    '[Pre-Flight] Production Meta variant 1405588742634526_122100337179498315 is strictly locked in published status'
  );

  const testTenantId = `tenant_scale_audit_${crypto.randomBytes(4).toString('hex')}`;
  const testUserId = `user_scale_owner_${crypto.randomBytes(4).toString('hex')}`;
  const createdBrandIds = [];
  const createdUserIds = [testUserId];
  const createdAccountIds = [];
  const createdRuleIds = [];
  const createdPostIds = [];

  try {
    // -------------------------------------------------------------------------
    // TRACK 1: Subscription Catalog & Scale Limit Definition
    // -------------------------------------------------------------------------
    console.log('\n--- [TRACK 1] Scale Plan Catalog Definition & Database Invariants ---');
    const scalePlan = await db('subscription_plans').where({ id: 'scale' }).first();
    assert(!!scalePlan, "Subscription plan 'scale' exists in database");
    assert(scalePlan?.max_brands === 100, `Scale max_brands is 100 (got ${scalePlan?.max_brands})`);
    assert(scalePlan?.max_users === 50, `Scale max_users (seats) is 50 (got ${scalePlan?.max_users})`);
    assert(scalePlan?.max_social_accounts === 250, `Scale max_social_accounts is 250 (got ${scalePlan?.max_social_accounts})`);
    assert(scalePlan?.max_posts_per_month === 10000, `Scale max_posts_per_month is 10,000 (got ${scalePlan?.max_posts_per_month})`);
    assert(Number(scalePlan?.storage_bytes_limit) === 536870912000, `Scale storage_bytes_limit is 536,870,912,000 bytes (500 GiB) (got ${scalePlan?.storage_bytes_limit})`);

    let planFeatures = {};
    try {
      planFeatures = typeof scalePlan?.features === 'string' ? JSON.parse(scalePlan.features) : (scalePlan?.features || {});
    } catch {}
    assert(planFeatures.max_active_automations === 200, `Scale max_active_automations is 200 (got ${planFeatures.max_active_automations})`);

    // -------------------------------------------------------------------------
    // Setup Isolated Test Tenant & Scale Subscription
    // -------------------------------------------------------------------------
    console.log('\n--- Provisioning Isolated Synthetic Scale Organization ---');
    await db('tenants').insert({
      id: testTenantId,
      name: 'Scale Audit Global Org',
      slug: `scale-audit-${crypto.randomBytes(4).toString('hex')}`,
      settings: JSON.stringify({ audit: true }),
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('users').insert({
      id: testUserId,
      email: `owner_${testTenantId}@socialforge.audit`,
      password_hash: 'audit_hash',
      full_name: 'Scale Organization Owner',
      is_superadmin: false,
      is_active: true,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db('tenant_users').insert({
      id: crypto.randomUUID(),
      tenant_id: testTenantId,
      user_id: testUserId,
      role: 'owner',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const now = new Date();
    const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db('tenant_subscriptions').insert({
      id: crypto.randomUUID(),
      tenant_id: testTenantId,
      plan_id: 'scale',
      status: 'active',
      provider: 'stripe',
      provider_customer_id: `cus_audit_${crypto.randomBytes(4).toString('hex')}`,
      provider_subscription_id: `sub_audit_${crypto.randomBytes(4).toString('hex')}`,
      current_period_start: now,
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      created_at: now,
      updated_at: now,
    });

    // -------------------------------------------------------------------------
    // TRACK 2: Dimension 1 — 100 Brands (Functional & Boundary Audit)
    // -------------------------------------------------------------------------
    console.log('\n--- [TRACK 2] Dimension 1: 100 Brands Capacity & Boundary ---');
    const startBrandsInsert = Date.now();
    const brandRows = [];
    for (let i = 1; i <= 100; i++) {
      const bId = crypto.randomUUID();
      createdBrandIds.push(bId);
      brandRows.push({
        id: bId,
        tenant_id: testTenantId,
        name: `Scale Brand ${String(i).padStart(3, '0')}`,
        slug: `scale-brand-${String(i).padStart(3, '0')}-${crypto.randomBytes(2).toString('hex')}`,
        industry: i % 2 === 0 ? 'SaaS' : 'E-commerce',
        timezone: 'UTC',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Insert 100 brands in batch
    await db('brands').insert(brandRows);
    const brandsInsertMs = Date.now() - startBrandsInsert;
    console.log(`  ⚡ Batch inserted 100 brands in ${brandsInsertMs}ms`);

    // Verify retrieval of 100 brands
    const startBrandsQuery = Date.now();
    const retrievedBrands = await db('brands').where({ tenant_id: testTenantId }).select('id', 'name', 'slug');
    const brandsQueryMs = Date.now() - startBrandsQuery;
    assert(retrievedBrands.length === 100, `Successfully queried all 100 brands (took ${brandsQueryMs}ms)`);
    benchmarkResults.brandsQuery100Ms = brandsQueryMs;

    // Verify Boundary Enforcement at 100 brands
    const brandCheck100 = await EntitlementService.canCreateBrand(testTenantId);
    assert(brandCheck100.current === 100, `canCreateBrand reports exactly 100 current brands`);
    assert(brandCheck100.limit === 100, `canCreateBrand reports limit of 100 brands`);
    assert(brandCheck100.remaining === 0, `canCreateBrand reports remaining = 0`);
    assert(brandCheck100.allowed === false, `canCreateBrand strictly rejects 101st brand`);

    const pgBrandCheck = await planGuardService.check(testTenantId, 'brands', 1);
    assert(pgBrandCheck.allowed === false, `PlanGuard strictly blocks 101st brand (allowed = false)`);
    assert(pgBrandCheck.upgradeRequired === true, `PlanGuard reports upgradeRequired = true for 101st brand`);

    // -------------------------------------------------------------------------
    // TRACK 3: Dimension 2 — 50 Team Seats (Functional & Boundary Audit)
    // -------------------------------------------------------------------------
    console.log('\n--- [TRACK 3] Dimension 2: 50 Team Seats Capacity & Boundary ---');
    const startSeatsInsert = Date.now();
    const userRows = [];
    const tenantUserRows = [];
    // User 1 was already created as owner. Insert remaining 49 users.
    for (let i = 2; i <= 50; i++) {
      const uId = crypto.randomUUID();
      createdUserIds.push(uId);
      userRows.push({
        id: uId,
        email: `member_${i}_${testTenantId}@socialforge.audit`,
        password_hash: 'audit_hash',
        full_name: `Team Member ${i}`,
        is_superadmin: false,
        is_active: true,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      tenantUserRows.push({
        id: crypto.randomUUID(),
        tenant_id: testTenantId,
        user_id: uId,
        role: i <= 5 ? 'admin' : i <= 20 ? 'editor' : 'viewer',
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    await db('users').insert(userRows);
    await db('tenant_users').insert(tenantUserRows);
    const seatsInsertMs = Date.now() - startSeatsInsert;
    console.log(`  ⚡ Provisioned 49 additional team seats (total: 50) in ${seatsInsertMs}ms`);

    // Verify retrieval of 50 members
    const startSeatsQuery = Date.now();
    const members = await db('tenant_users')
      .join('users', 'tenant_users.user_id', 'users.id')
      .where({ 'tenant_users.tenant_id': testTenantId })
      .select('tenant_users.id', 'users.email', 'tenant_users.role');
    const seatsQueryMs = Date.now() - startSeatsQuery;
    assert(members.length === 50, `Successfully retrieved all 50 workspace team members (took ${seatsQueryMs}ms)`);
    benchmarkResults.seatsQuery50Ms = seatsQueryMs;

    // Boundary check at 50 seats
    const seatCheck50 = await EntitlementService.canCreateUser(testTenantId);
    assert(seatCheck50.current === 50, `canCreateUser reports exactly 50 current members`);
    assert(seatCheck50.limit === 50, `canCreateUser reports limit of 50 members`);
    assert(seatCheck50.allowed === false, `canCreateUser strictly rejects 51st team member`);

    const pgSeatCheck = await planGuardService.check(testTenantId, 'seats', 1);
    assert(pgSeatCheck.allowed === false, `PlanGuard strictly blocks 51st seat (allowed = false)`);

    // -------------------------------------------------------------------------
    // TRACK 4: Dimension 3 — 250 Connected Social Accounts (Capacity & Boundary)
    // -------------------------------------------------------------------------
    console.log('\n--- [TRACK 4] Dimension 3: 250 Connected Social Accounts ---');
    const startAccountsInsert = Date.now();
    const platforms = ['instagram', 'facebook', 'linkedin', 'x_twitter', 'tiktok'];
    const accountRows = [];

    // Distribute 250 accounts across the 100 brands (2.5 accounts/brand)
    for (let i = 1; i <= 250; i++) {
      const accId = crypto.randomUUID();
      createdAccountIds.push(accId);
      const targetBrandId = createdBrandIds[(i - 1) % createdBrandIds.length];
      const platform = platforms[(i - 1) % platforms.length];
      accountRows.push({
        id: accId,
        brand_id: targetBrandId,
        tenant_id: testTenantId,
        platform,
        account_name: `${platform.toUpperCase()} Account ${i}`,
        account_id: `act_${platform}_${i}_${crypto.randomBytes(2).toString('hex')}`,
        access_token_encrypted: 'audit_aes_256_gcm_token',
        is_active: true,
        metadata: JSON.stringify({ handle: `@handle_${i}`, followerCount: 1000 * i }),
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Insert in batches of 50
    for (let b = 0; b < accountRows.length; b += 50) {
      await db('social_accounts').insert(accountRows.slice(b, b + 50));
    }
    const accountsInsertMs = Date.now() - startAccountsInsert;
    console.log(`  ⚡ Created 250 social accounts across 100 brands in ${accountsInsertMs}ms`);

    // Query 250 accounts
    const startAccountsQuery = Date.now();
    const retrievedAccounts = await db('social_accounts').where({ tenant_id: testTenantId });
    const accountsQueryMs = Date.now() - startAccountsQuery;
    assert(retrievedAccounts.length === 250, `Successfully queried all 250 connected social accounts (took ${accountsQueryMs}ms)`);
    benchmarkResults.accountsQuery250Ms = accountsQueryMs;

    // Boundary check at 250 social accounts
    const accountCheck250 = await EntitlementService.canConnectSocialAccount(testTenantId);
    assert(accountCheck250.current === 250, `canConnectSocialAccount reports 250 current accounts`);
    assert(accountCheck250.limit === 250, `canConnectSocialAccount reports limit of 250 accounts`);
    assert(accountCheck250.allowed === false, `canConnectSocialAccount strictly blocks 251st account`);

    const pgAccountCheck = await planGuardService.check(testTenantId, 'social_accounts', 1);
    assert(pgAccountCheck.allowed === false, `PlanGuard strictly blocks 251st account (allowed = false)`);

    // -------------------------------------------------------------------------
    // TRACK 5: Dimension 4 — 200 Automation Rules (Capacity & Boundary)
    // -------------------------------------------------------------------------
    console.log('\n--- [TRACK 5] Dimension 4: 200 Automation Rules ---');
    const startRulesInsert = Date.now();
    const ruleRows = [];
    for (let i = 1; i <= 200; i++) {
      const rId = crypto.randomUUID();
      createdRuleIds.push(rId);
      const targetBrandId = createdBrandIds[(i - 1) % createdBrandIds.length];
      ruleRows.push({
        id: rId,
        tenant_id: testTenantId,
        brand_id: targetBrandId,
        name: `Automated Pipeline ${String(i).padStart(3, '0')}`,
        description: 'Auto-publish and repurpose across channels',
        trigger_type: i % 2 === 0 ? 'schedule' : 'webhook',
        trigger_config: JSON.stringify({ cron: '0 9 * * *', timezone: 'UTC' }),
        actions: JSON.stringify([{ type: 'generate_post', platform: 'linkedin' }]),
        status: 'active',
        execution_count: i * 5,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    // Insert in batches of 50
    for (let b = 0; b < ruleRows.length; b += 50) {
      await db('automations').insert(ruleRows.slice(b, b + 50));
    }
    const rulesInsertMs = Date.now() - startRulesInsert;
    console.log(`  ⚡ Inserted 200 active automation rules in ${rulesInsertMs}ms`);

    // Query 200 automation rules
    const startRulesQuery = Date.now();
    const retrievedRules = await db('automations').where({ tenant_id: testTenantId, status: 'active' });
    const rulesQueryMs = Date.now() - startRulesQuery;
    assert(retrievedRules.length === 200, `Successfully retrieved all 200 active automation rules (took ${rulesQueryMs}ms)`);
    benchmarkResults.rulesQuery200Ms = rulesQueryMs;

    // Boundary check at 200 active automations
    const pgRuleCheck = await planGuardService.check(testTenantId, 'active_automations', 1);
    assert(pgRuleCheck.current === 200, `PlanGuard reports current active automations = 200`);
    assert(pgRuleCheck.limit === 200, `PlanGuard reports active automations limit = 200`);
    assert(pgRuleCheck.allowed === false, `PlanGuard strictly blocks 201st active automation (allowed = false)`);

    // -------------------------------------------------------------------------
    // TRACK 6: Dimension 5 — 10,000 Posts Per Month (Database Scale & Index Performance)
    // -------------------------------------------------------------------------
    console.log('\n--- [TRACK 6] Dimension 5: 10,000 Posts Per Month Capacity ---');
    console.log('  Generating 10,000 synthetic posts across 100 brands...');
    const startPostsInsert = Date.now();
    const postBatchSize = 1000;
    const totalPostsToInsert = 10000;

    for (let batchStart = 0; batchStart < totalPostsToInsert; batchStart += postBatchSize) {
      const postsBatch = [];
      const variantsBatch = [];

      for (let i = batchStart + 1; i <= batchStart + postBatchSize; i++) {
        const pId = crypto.randomUUID();
        createdPostIds.push(pId);
        const targetBrand = createdBrandIds[(i - 1) % createdBrandIds.length];
        const status = i <= 6000 ? 'published' : i <= 8500 ? 'scheduled' : i <= 9500 ? 'in_review' : 'draft';

        postsBatch.push({
          id: pId,
          tenant_id: testTenantId,
          brand_id: targetBrand,
          author_id: testUserId,
          title: `Post ${i}: Scale Social Marketing Arc`,
          base_content: `Engaging high-converting content copy for post index ${i} with actionable value.`,
          status,
          scheduled_for: status === 'scheduled' ? new Date(Date.now() + 3600000 * (i % 72)) : null,
          published_at: status === 'published' ? new Date(Date.now() - 3600000 * (i % 72)) : null,
          created_at: new Date(Date.now() - 86400000 * (i % 30)),
          updated_at: new Date(),
        });

        // 2 platform variants per post
        const v1Id = crypto.randomUUID();
        const v2Id = crypto.randomUUID();
        variantsBatch.push({
          id: v1Id,
          post_id: pId,
          platform: 'instagram',
          content: `Instagram caption for post ${i} #growth #scale`,
          media_asset_ids: '[]',
          platform_specific_config: '{}',
          status: status === 'published' ? 'published' : 'pending',
          remote_post_id: status === 'published' ? `ig_${i}_${crypto.randomBytes(3).toString('hex')}` : null,
          created_at: new Date(),
          updated_at: new Date(),
        });
        variantsBatch.push({
          id: v2Id,
          post_id: pId,
          platform: 'linkedin',
          content: `LinkedIn thought leadership post ${i} on social enterprise scale.`,
          media_asset_ids: '[]',
          platform_specific_config: '{}',
          status: status === 'published' ? 'published' : 'pending',
          remote_post_id: status === 'published' ? `li_${i}_${crypto.randomBytes(3).toString('hex')}` : null,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }

      await db('posts').insert(postsBatch);
      await db('post_variants').insert(variantsBatch);
      process.stdout.write(`  ... inserted ${batchStart + postBatchSize} / ${totalPostsToInsert} posts\r`);
    }
    const postsInsertMs = Date.now() - startPostsInsert;
    console.log(`\n  ⚡ Successfully generated 10,000 posts and 20,000 variants in ${postsInsertMs}ms (${(10000 / (postsInsertMs / 1000)).toFixed(0)} posts/sec)`);

    // Query Benchmarks on 10,000 posts dataset
    const postQueryLatencies = [];
    for (let testRun = 0; testRun < 20; testRun++) {
      const qStart = Date.now();
      const page = (testRun % 10) + 1;
      const brandFilter = createdBrandIds[testRun % 5];
      await db('posts')
        .where({ tenant_id: testTenantId, brand_id: brandFilter })
        .orderBy('created_at', 'desc')
        .limit(25)
        .offset((page - 1) * 25);
      postQueryLatencies.push(Date.now() - qStart);
    }
    const postStats = calculatePercentiles(postQueryLatencies);
    console.log(`  📊 Filtered & Paged Query on 10,000 Posts: p50 = ${postStats.p50}ms | p95 = ${postStats.p95}ms | p99 = ${postStats.p99}ms (avg: ${postStats.avg}ms)`);
    assert(postStats.p95 < 100, `Posts query latency p95 is under 100ms (measured: ${postStats.p95}ms)`);
    benchmarkResults.postsQueryStats = postStats;

    // Monthly Quota Limit Enforcement at 10,000 posts
    const periodMonth = UsageTrackerService.getCurrentPeriodMonth();
    await db('tenant_usage_counters').insert({
      tenant_id: testTenantId,
      period_month: periodMonth,
      posts_published: 10000,
      posts_created: 10000,
      video_render_seconds: 0,
      ai_tokens_consumed: 0,
      storage_bytes_used: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const postCheck10k = await EntitlementService.canPublish(testTenantId, 1);
    assert(postCheck10k.current === 10000, `canPublish reports current usage = 10,000 posts`);
    assert(postCheck10k.limit === 10000, `canPublish reports limit = 10,000 posts`);
    assert(postCheck10k.remaining === 0, `canPublish reports remaining = 0`);
    assert(postCheck10k.allowed === false, `canPublish strictly rejects 10,001st monthly post (allowed = false)`);

    const pgPostCheck = await planGuardService.check(testTenantId, 'posts', 1);
    assert(pgPostCheck.allowed === false, `PlanGuard strictly blocks 10,001st monthly post`);

    // -------------------------------------------------------------------------
    // TRACK 7: Dimension 6 — 500 GB Storage Accounting & Architectural Evaluation
    // -------------------------------------------------------------------------
    console.log('\n--- [TRACK 7] Dimension 6: 500 GB Storage Quota Accounting ---');
    const scaleStorageLimitBytes = 536870912000; // 500 GiB

    // Set usage to 499 GB
    const usedBytes499GB = 535800000000;
    await db('tenant_usage_counters')
      .where({ tenant_id: testTenantId, period_month: periodMonth })
      .update({ storage_bytes_used: usedBytes499GB });

    const checkUnderLimit = await planGuardService.check(testTenantId, 'storage', 10485760); // 10 MB upload
    assert(checkUnderLimit.allowed === true, `10 MB upload permitted when current usage is 499 GB / 500 GB`);

    // Set usage to 500.1 GB
    const usedBytesOver = 537000000000;
    await db('tenant_usage_counters')
      .where({ tenant_id: testTenantId, period_month: periodMonth })
      .update({ storage_bytes_used: usedBytesOver });

    const checkOverLimit = await planGuardService.check(testTenantId, 'storage', 10485760);
    assert(checkOverLimit.allowed === false, `Upload strictly blocked when storage exceeds 500 GB (allowed = false)`);
    assert(checkOverLimit.upgradeRequired === true, `Storage quota reports upgradeRequired = true`);

    // -------------------------------------------------------------------------
    // TRACK 8: Concurrency & Performance Load Test (50-Worker Workload)
    // -------------------------------------------------------------------------
    console.log('\n--- [TRACK 8] Concurrency & High-Throughput Load Simulation (50 Concurrent Workers) ---');
    const concurrency = 50;
    const requestsPerWorker = 10;
    const totalRequests = concurrency * requestsPerWorker; // 500 concurrent operations
    const concurrentLatencies = [];
    let concurrentSuccess = 0;
    let concurrentErrors = 0;

    const startConcurrency = Date.now();
    const workerPromises = Array.from({ length: concurrency }).map(async (_, workerId) => {
      for (let r = 0; r < requestsPerWorker; r++) {
        const reqStart = Date.now();
        try {
          const operationType = (workerId + r) % 3;
          if (operationType === 0) {
            // Retrieve brand list
            await db('brands').where({ tenant_id: testTenantId }).select('id', 'name').limit(20);
          } else if (operationType === 1) {
            // Retrieve paginated posts with status filter
            await db('posts')
              .where({ tenant_id: testTenantId, status: 'published' })
              .orderBy('created_at', 'desc')
              .limit(20);
          } else {
            // Execute PlanGuard entitlement check
            await planGuardService.check(testTenantId, 'posts', 1);
          }
          concurrentLatencies.push(Date.now() - reqStart);
          concurrentSuccess++;
        } catch (err) {
          concurrentErrors++;
        }
      }
    });

    await Promise.all(workerPromises);
    const totalConcurrencyDurationMs = Date.now() - startConcurrency;
    const throughputRps = (totalRequests / (totalConcurrencyDurationMs / 1000)).toFixed(1);
    const concurrentStats = calculatePercentiles(concurrentLatencies);

    console.log(`  ⚡ Executed ${totalRequests} operations across ${concurrency} concurrent workers in ${totalConcurrencyDurationMs}ms`);
    console.log(`  📊 Throughput: ${throughputRps} req/sec`);
    console.log(`  📊 Latencies: p50 = ${concurrentStats.p50}ms | p95 = ${concurrentStats.p95}ms | p99 = ${concurrentStats.p99}ms | max = ${concurrentStats.max}ms`);
    console.log(`  📊 Error rate: ${((concurrentErrors / totalRequests) * 100).toFixed(2)}% (${concurrentSuccess} succeeded, ${concurrentErrors} failed)`);

    assert(concurrentErrors === 0, `Zero errors under 50-worker concurrent load (100% success)`);
    assert(concurrentStats.p95 < 250, `50-worker concurrency p95 latency is under 250ms (measured: ${concurrentStats.p95}ms)`);
    benchmarkResults.concurrency50Stats = {
      throughputRps: Number(throughputRps),
      durationMs: totalConcurrencyDurationMs,
      ...concurrentStats,
    };

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP & TEARDOWN
    // -------------------------------------------------------------------------
    console.log('\n--- Cleaning Up Synthetic Audit Fixtures ---');
    try {
      if (createdPostIds.length > 0) {
        // Delete post variants and posts in chunks to avoid lock contention
        for (let b = 0; b < createdPostIds.length; b += 1000) {
          const chunk = createdPostIds.slice(b, b + 1000);
          await db('post_variants').whereIn('post_id', chunk).del();
          await db('posts').whereIn('id', chunk).del();
        }
      }
      await db('automations').where({ tenant_id: testTenantId }).del();
      await db('social_accounts').where({ tenant_id: testTenantId }).del();
      await db('tenant_users').where({ tenant_id: testTenantId }).del();
      await db('brands').where({ tenant_id: testTenantId }).del();
      await db('tenant_usage_counters').where({ tenant_id: testTenantId }).del();
      await db('tenant_subscriptions').where({ tenant_id: testTenantId }).del();
      await db('users').whereIn('id', createdUserIds).del();
      await db('tenants').where({ id: testTenantId }).del();
      console.log('  ✓ Cleaned up all synthetic audit test records without residual leaks.');
    } catch (cleanupErr) {
      console.error('  ⚠️ Error during cleanup:', cleanupErr);
    }

    // Verify post-flight Meta publication lock invariant
    const postMetaVariant = await db('post_variants')
      .where({ remote_post_id: '1405588742634526_122100337179498315' })
      .first();
    assert(
      postMetaVariant && postMetaVariant.status === 'published',
      '[Post-Flight] Production Meta variant 1405588742634526_122100337179498315 strictly remains locked in published status'
    );
  }

  console.log('\n========================================================================');
  console.log(`   SCALE CAPACITY AUDIT RUN COMPLETED: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('Unhandled fatal error in Scale capacity audit:', err);
  process.exit(1);
});
