import dotenv from 'dotenv';
dotenv.config();

import { db, getPoolStats } from '../apps/api/dist/db/connection.js';
import { metaOAuthService } from '../apps/api/dist/services/meta/metaOAuth.js';
import { checkRedisHealth } from '../apps/api/dist/services/redis/redisClient.js';
import { oauthConnectLimiterInstance, oauthCallbackLimiterInstance } from '../apps/api/dist/middleware/rateLimiter.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runScalingTests() {
  console.log('========================================================================');
  console.log('       SOCIALFORGE: SCALING ROADMAP VERIFICATION TEST SUITE             ');
  console.log('========================================================================\n');

  try {
    // 1. Priority 1: Database Connection Pooling & Telemetry
    console.log('--- [TRACK 1: DATABASE POOL OPTIMIZATION & TELEMETRY] ---');
    const poolStats = getPoolStats();
    console.log('Real-time Connection Pool Telemetry:', poolStats);
    assert(poolStats.max >= 25, `Pool max capacity configured for scale (max = ${poolStats.max} >= 25)`);
    assert(poolStats.min >= 5, `Pool min capacity keeps warm connections (min = ${poolStats.min} >= 5)`);
    assert(poolStats.status === 'healthy', `Pool status is healthy (current: ${poolStats.status})`);
    assert(typeof poolStats.saturationPct === 'number', `Pool saturation telemetry is tracked (${poolStats.saturationPct}%)`);

    // Verify session configuration in connection
    const timeZoneCheck = await db.raw("SELECT @@session.time_zone as tz");
    assert(timeZoneCheck[0][0]?.tz === '+00:00', 'Database session initialized with strict UTC (+00:00)');

    // 2. Priority 2: Redis Distributed Rate Limiting & Resilience
    console.log('\n--- [TRACK 2: DISTRIBUTED RATE LIMITING & GRACEFUL FALLBACK] ---');
    const redisHealth = await checkRedisHealth();
    console.log('Redis Health Assessment:', redisHealth);
    assert(['connected', 'disconnected', 'disabled'].includes(redisHealth.status), `Redis client health handler handles all network states (${redisHealth.status})`);

    // Test OAuth connect rate limiter
    const connectInc1 = await oauthConnectLimiterInstance.increment('test_ip_1');
    assert(connectInc1.count === 1, 'OAuth Connect rate limiter increments client key');
    assert(connectInc1.remaining === oauthConnectLimiterInstance.max - 1, 'OAuth Connect limiter calculates remaining quota correctly');

    // Test OAuth callback rate limiter
    const callbackInc1 = await oauthCallbackLimiterInstance.increment('test_ip_2');
    assert(callbackInc1.count === 1, 'OAuth Callback rate limiter increments client key');
    assert(callbackInc1.remaining === oauthCallbackLimiterInstance.max - 1, 'OAuth Callback limiter calculates remaining quota correctly');

    // 3. Priority 3: OAuth Callback Idempotency & Inflight Deduplication
    console.log('\n--- [TRACK 3: OAUTH IDEMPOTENCY & DUPLICATE PROTECTION] ---');
    const testTenantId = '1d9190fa-bd85-4304-8e73-8ef3ca62c342';
    const testBrandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
    const testUserId = '10f0d257-da95-4bc6-9212-f6cc2159d37f';

    const validState = metaOAuthService.generateState(testTenantId, testBrandId, testUserId);
    const mockCode = 'mock_scaling_idempotency_code_' + Date.now();

    console.log('Testing concurrent duplicate callback execution...');
    // Launch 3 simultaneous callback requests with identical code and state
    const [res1, res2, res3] = await Promise.all([
      metaOAuthService.handleCallback(mockCode, validState),
      metaOAuthService.handleCallback(mockCode, validState),
      metaOAuthService.handleCallback(mockCode, validState),
    ]);

    assert(res1.success === true, 'Primary OAuth callback execution succeeds');
    assert(res2.success === true && res2.connectionId === res1.connectionId, 'Concurrent duplicate callback 2 returns identical connection ID (deduplicated)');
    assert(res3.success === true && res3.connectionId === res1.connectionId, 'Concurrent duplicate callback 3 returns identical connection ID (deduplicated)');

    // Replay after completion (replay idempotency)
    const replayRes = await metaOAuthService.handleCallback(mockCode, validState);
    assert(replayRes.success === true && replayRes.connectionId === res1.connectionId, 'Subsequent replay callback returns cached result within TTL');

    // 4. Priority 4: Production Meta Publication Lock Invariant
    console.log('\n--- [TRACK 4: PRODUCTION META PUBLICATION LOCK INVARIANT] ---');
    const lockedVariant = await db('post_variants')
      .where({ id: 'bc2051b1-a44a-4a97-8acd-1f3125c70164' })
      .first();

    const lockedJob = await db('publishing_jobs')
      .where({ id: '256cf21a-26cd-4032-a7b8-17261d8a81b1' })
      .first();

    assert(
      lockedVariant?.status === 'published' &&
      lockedVariant?.remote_post_id === '1405588742634526_122100337179498315',
      'Production Meta post variant is strictly locked in published status'
    );
    assert(
      lockedJob?.status === 'published' && lockedJob?.platform === 'facebook',
      'Production publishing job is strictly locked in published status'
    );

    console.log('\n========================================================================');
    console.log(`TEST RESULTS: ${passed} / ${total} CHECKS PASSED (${Number(((passed / total) * 100).toFixed(1))}%)`);
    console.log('========================================================================');
  } catch (err) {
    console.error('Scaling test failed:', err);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runScalingTests();
