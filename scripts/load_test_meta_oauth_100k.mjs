import http from 'http';
import crypto from 'crypto';
import os from 'os';
import dotenv from 'dotenv';
dotenv.config();

import { db, getPoolStats } from '../apps/api/dist/db/connection.js';

http.globalAgent.maxSockets = 50000;

function calculatePercentiles(latencies) {
  if (latencies.length === 0) return { min: 0, max: 0, mean: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const mean = sum / sorted.length;
  const p50 = sorted[Math.floor(sorted.length * 0.50)];
  const p90 = sorted[Math.floor(sorted.length * 0.90)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)];
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: Number(mean.toFixed(2)),
    p50,
    p90,
    p95,
    p99,
  };
}

let testTenantId;
let testBrandId;
let testUserId;

async function initTestFixtures() {
  const tenant = await db('tenants').first();
  const brand = await db('brands').where({ tenant_id: tenant.id }).first() || await db('brands').first();
  const user = await db('users').first();
  testTenantId = tenant.id;
  testBrandId = brand.id;
  testUserId = user.id;
}

// Executes an HTTP request and measures latency
function httpRequest(options) {
  return new Promise((resolve) => {
    const start = Date.now();
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          durationMs: Date.now() - start,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 0,
        error: err.code || err.message,
        durationMs: Date.now() - start,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        statusCode: 408,
        error: 'ETIMEDOUT',
        durationMs: Date.now() - start,
      });
    });

    req.end();
  });
}

// Simulates a complete OAuth connection attempt:
// Step 1: Connect initiation (generates valid HMAC state)
// Step 2: Callback execution through Mock Meta Gateway
async function simulateOAuthConnectionAttempt(attemptId) {
  const start = Date.now();

  // 1. Initiate connect to get valid signed state
  const connectRes = await httpRequest({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/integrations/meta/connect?brandId=${testBrandId}&format=json`,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-bypass-rate-limit': 'test-runner',
      'Connection': 'keep-alive',
    },
    timeout: 10000,
  });

  if (connectRes.statusCode !== 200) {
    return {
      success: false,
      stage: 'connect',
      error: `HTTP_${connectRes.statusCode}`,
      durationMs: Date.now() - start,
    };
  }

  let state;
  try {
    const data = JSON.parse(connectRes.body);
    const authUrl = data?.data?.authorizationUrl || data?.authorizationUrl || data?.authUrl;
    if (authUrl) {
      const u = new URL(authUrl);
      state = u.searchParams.get('state');
    } else if (data?.state) {
      state = data.state;
    }
  } catch {
    return {
      success: false,
      stage: 'parse_state',
      error: 'PARSE_ERR',
      durationMs: Date.now() - start,
    };
  }

  if (!state) {
    return {
      success: false,
      stage: 'missing_state',
      error: 'NO_STATE',
      durationMs: Date.now() - start,
    };
  }

  // 2. Call callback with mock code and state
  const mockCode = `mock_oauth_code_${attemptId}_${crypto.randomBytes(4).toString('hex')}`;
  const callbackRes = await httpRequest({
    hostname: '127.0.0.1',
    port: 4000,
    path: `/api/v1/integrations/meta/callback?code=${mockCode}&state=${encodeURIComponent(state)}`,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'x-bypass-rate-limit': 'test-runner',
      'Connection': 'keep-alive',
    },
    timeout: 15000,
  });

  // Successful callback responds with 200 JSON or 302 redirect to web app
  const isSuccess = callbackRes.statusCode === 200 || callbackRes.statusCode === 302;
  return {
    success: isSuccess,
    statusCode: callbackRes.statusCode,
    durationMs: Date.now() - start,
    error: isSuccess ? null : `HTTP_${callbackRes.statusCode}`,
  };
}

async function runOAuthStage(targetAttempts, concurrency = 50) {
  console.log(`\n========================================================================`);
  console.log(`   STAGE: ${targetAttempts.toLocaleString()} CONCURRENT OAUTH ATTEMPTS`);
  console.log(`   Worker Concurrency: ${concurrency} parallel HTTP lanes | DB Pool Max: 30`);
  console.log(`========================================================================`);

  const stageStart = Date.now();
  const startCpu = process.cpuUsage();
  const startMem = process.memoryUsage();

  const latencies = [];
  const errors = {};
  let completed = 0;
  let successful = 0;
  let failed = 0;
  let attemptIndex = 0;
  let peakSaturation = 0;

  async function clientLane() {
    while (true) {
      const idx = attemptIndex++;
      if (idx >= targetAttempts) break;

      const res = await simulateOAuthConnectionAttempt(idx);

      // Sample latencies to preserve heap during 50k/100k runs
      if (targetAttempts <= 10000 || idx % 20 === 0) {
        latencies.push(res.durationMs);
        const pool = getPoolStats();
        if (pool.saturationPct > peakSaturation) {
          peakSaturation = pool.saturationPct;
        }
      }

      completed++;
      if (res.success) {
        successful++;
      } else {
        failed++;
        const errKey = res.error || 'UNKNOWN_ERR';
        errors[errKey] = (errors[errKey] || 0) + 1;
      }

      if (completed % 1000 === 0 || completed === targetAttempts) {
        const elapsedSec = (Date.now() - stageStart) / 1000;
        const currentRate = (completed / elapsedSec).toFixed(1);
        process.stdout.write(`  -> Completed ${completed.toLocaleString()} / ${targetAttempts.toLocaleString()} attempts (${currentRate} req/s, success: ${((successful / completed) * 100).toFixed(1)}%)\r`);
      }
    }
  }

  const lanes = [];
  for (let c = 0; c < concurrency; c++) {
    lanes.push(clientLane());
  }
  await Promise.all(lanes);

  const durationSec = (Date.now() - stageStart) / 1000;
  const throughput = Number((targetAttempts / durationSec).toFixed(1));
  const stats = calculatePercentiles(latencies);

  const endCpu = process.cpuUsage(startCpu);
  const endMem = process.memoryUsage();
  const cpuPercent = Number(((endCpu.user + endCpu.system) / (durationSec * 1000000) * 100).toFixed(1));
  const finalPool = getPoolStats();

  console.log(`\n  ✓ Stage Completed: ${targetAttempts.toLocaleString()} attempts in ${durationSec.toFixed(2)}s`);
  console.log(`    - Throughput: ${throughput} attempts/sec`);
  console.log(`    - Success Rate: ${((successful / targetAttempts) * 100).toFixed(2)}% (${successful.toLocaleString()} succeeded, ${failed.toLocaleString()} failed)`);
  console.log(`    - Latency (p50/p95/p99): p50=${stats.p50}ms, p95=${stats.p95}ms, p99=${stats.p99}ms, max=${stats.max}ms`);
  console.log(`    - Errors:`, Object.keys(errors).length > 0 ? errors : 'None (0 errors)');
  console.log(`    - Peak Pool Saturation: ${peakSaturation}% | Final Status: ${finalPool.status}`);
  console.log(`    - CPU Usage: ${cpuPercent}% | Memory RSS: ${(endMem.rss / (1024 * 1024)).toFixed(1)} MB`);

  return {
    targetAttempts,
    concurrency,
    durationSec: Number(durationSec.toFixed(2)),
    throughputReqSec: throughput,
    successful,
    failed,
    successRatePct: Number(((successful / targetAttempts) * 100).toFixed(2)),
    latencies: stats,
    errors,
    peakSaturation,
    cpuPercent,
    rssMb: Number((endMem.rss / (1024 * 1024)).toFixed(1)),
  };
}

async function runFullOAuthSuite() {
  await initTestFixtures();

  console.log('************************************************************************');
  console.log('   SOCIALFORGE: 100,000 OAUTH STAGING LOAD HARNESS                     ');
  console.log('   Backed by Containerized Mock Meta Provider Gateway (:4005)          ');
  console.log('************************************************************************');
  console.log(`Host CPU: ${os.cpus().length} cores | Memory: ${(os.totalmem() / (1024**3)).toFixed(1)} GB`);
  console.log(`Test Brand ID: ${testBrandId} | Test Tenant ID: ${testTenantId}`);

  const results = [];

  // STAGE 1: 1,000 Concurrent OAuth Attempts
  const s1 = await runOAuthStage(1000, 50);
  results.push(s1);

  // STAGE 2: 5,000 Concurrent OAuth Attempts
  const s2 = await runOAuthStage(5000, 50);
  results.push(s2);

  // STAGE 3: 10,000 Concurrent OAuth Attempts
  const s3 = await runOAuthStage(10000, 100);
  results.push(s3);

  // STAGE 4: 25,000 Concurrent OAuth Attempts
  const s4 = await runOAuthStage(25000, 100);
  results.push(s4);

  // STAGE 5: 50,000 Concurrent OAuth Attempts
  const s5 = await runOAuthStage(50000, 150);
  results.push(s5);

  // STAGE 6: 100,000 Concurrent OAuth Attempts
  const s6 = await runOAuthStage(100000, 200);
  results.push(s6);

  // Invariant check: Permanent production Meta publication lock
  console.log('\n--- [INVARIANT CHECK: PRODUCTION META PUBLICATION LOCK] ---');
  const lockedVariant = await db('post_variants')
    .where({ id: 'bc2051b1-a44a-4a97-8acd-1f3125c70164' })
    .first();
  const lockedJob = await db('publishing_jobs')
    .where({ id: '256cf21a-26cd-4032-a7b8-17261d8a81b1' })
    .first();

  const isLockIntact =
    lockedVariant?.status === 'published' &&
    lockedVariant?.remote_post_id === '1405588742634526_122100337179498315' &&
    lockedJob?.status === 'published';

  console.log(`Production Lock Status: ${isLockIntact ? '✅ LOCKED & INTACT' : '❌ VIOLATION DETECTED'}\n`);

  console.log('************************************************************************');
  console.log('   STAGE 1 LOAD HARNESS SUMMARY                                         ');
  console.log('************************************************************************');
  for (const r of results) {
    console.log(`- ${r.targetAttempts.toLocaleString()} Attempts: ${r.throughputReqSec} req/s | Success: ${r.successRatePct}% | p95: ${r.latencies.p95}ms | Peak Pool: ${r.peakSaturation}%`);
  }
  console.log('************************************************************************\n');

  await db.destroy();
}

runFullOAuthSuite().catch((err) => {
  console.error('OAuth suite failed:', err);
  process.exit(1);
});
