import crypto from 'crypto';
import os from 'os';
import dotenv from 'dotenv';
dotenv.config();

import { db, getPoolStats } from '../apps/api/dist/db/connection.js';

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

async function simulatePublishWorker(jobId, platform, accountId) {
  const start = Date.now();
  const now = new Date();

  // 1. Atomic claim check: ensure job is in pending state and lock it
  const affected = await db('publishing_jobs')
    .where({ id: jobId, status: 'scheduled' })
    .update({
      status: 'publishing',
      attempt_count: db.raw('COALESCE(attempt_count, 0) + 1'),
      updated_at: now,
    });

  if (affected === 0) {
    // Already claimed or finished (idempotency protection)
    return { skipped: true, durationMs: Date.now() - start };
  }

  // 2. Mock external platform dispatch (simulated provider network delay: 5-15ms)
  await new Promise((resolve) => setTimeout(resolve, 5 + Math.random() * 10));

  // 3. Complete job with simulated external post ID
  const externalPostId = `mock_stress_${platform}_${crypto.randomBytes(6).toString('hex')}`;
  const externalPostUrl = `https://${platform}.com/posts/${externalPostId}`;

  await db('publishing_jobs')
    .where({ id: jobId })
    .update({
      status: 'sandbox',
      external_post_id: externalPostId,
      external_post_url: externalPostUrl,
      last_error: null,
      updated_at: new Date(),
    });

  return {
    success: true,
    jobId,
    externalPostId,
    durationMs: Date.now() - start,
  };
}

let validTenantId;
let validBrandId;
let validUserId;

async function initContext() {
  const tenant = await db('tenants').first();
  const brand = await db('brands').where({ tenant_id: tenant.id }).first() || await db('brands').first();
  const user = await db('users').first();
  validTenantId = tenant.id;
  validBrandId = brand.id;
  validUserId = user.id;
}

async function runWorkerStage(jobCount, workerConcurrency = 20) {
  const createdJobIds = [];

  const startCpu = process.cpuUsage();
  const startMem = process.memoryUsage();
  const stageStart = Date.now();

  try {
    // 1. Batch insertion of synthetic jobs
    const BATCH_INSERT_SIZE = 500;
    const insertStart = Date.now();
    for (let i = 0; i < jobCount; i += BATCH_INSERT_SIZE) {
      const chunkCount = Math.min(BATCH_INSERT_SIZE, jobCount - i);
      const rows = [];
      for (let j = 0; j < chunkCount; j++) {
        const id = crypto.randomUUID();
        createdJobIds.push(id);
        const platform = j % 2 === 0 ? 'facebook' : 'instagram';
        rows.push({
          id,
          tenant_id: validTenantId,
          brand_id: validBrandId,
          user_id: validUserId,
          post_id: null,
          platform,
          account_id: `acc_${platform}_mock_123`,
          status: 'scheduled',
          scheduled_at: new Date(Date.now() - 1000), // due immediately
          attempt_count: 0,
          max_attempts: 3,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
      await db('publishing_jobs').insert(rows);
    }
    const insertDurationSec = (Date.now() - insertStart) / 1000;
    const ingestionRate = Number((jobCount / insertDurationSec).toFixed(1));

    // 2. Concurrent Worker Processing Simulation
    const processingStart = Date.now();
    const latencies = [];
    let processed = 0;
    let successful = 0;
    let skipped = 0;
    let jobIndex = 0;

    async function workerLoop() {
      while (jobIndex < createdJobIds.length) {
        const idx = jobIndex++;
        const jId = createdJobIds[idx];
        const platform = idx % 2 === 0 ? 'facebook' : 'instagram';
        const res = await simulatePublishWorker(jId, platform, 'acc_mock_123');
        latencies.push(res.durationMs);
        processed++;
        if (res.success) successful++;
        if (res.skipped) skipped++;
      }
    }

    const workers = [];
    for (let w = 0; w < workerConcurrency; w++) {
      workers.push(workerLoop());
    }
    await Promise.all(workers);

    const processingDurationSec = (Date.now() - processingStart) / 1000;
    const processingThroughput = Number((successful / processingDurationSec).toFixed(1));
    const stats = calculatePercentiles(latencies);

    const endCpu = process.cpuUsage(startCpu);
    const endMem = process.memoryUsage();
    const cpuPercent = Number(((endCpu.user + endCpu.system) / ((Date.now() - stageStart) * 1000) * 100).toFixed(1));
    const poolStats = getPoolStats();

    return {
      jobCount,
      workerConcurrency,
      ingestionRateJobsSec: ingestionRate,
      processingThroughputJobsSec: processingThroughput,
      processingDurationSec: Number(processingDurationSec.toFixed(2)),
      successful,
      skipped,
      successRatePct: Number(((successful / jobCount) * 100).toFixed(2)),
      latencies: stats,
      cpuPercent,
      rssMb: Number((endMem.rss / (1024 * 1024)).toFixed(2)),
      poolStats,
    };
  } finally {
    // Teardown: Safely prune synthetic stress test jobs
    if (createdJobIds.length > 0) {
      const CHUNK_DELETE = 1000;
      for (let d = 0; d < createdJobIds.length; d += CHUNK_DELETE) {
        const toDelete = createdJobIds.slice(d, d + CHUNK_DELETE);
        await db('publishing_jobs').whereIn('id', toDelete).del();
      }
    }
  }
}

async function runExtendedStressSuite() {
  await initContext();
  console.log('========================================================================');
  console.log('   SOCIALFORGE: BACKGROUND PUBLISHING QUEUE & WORKER STRESS TEST        ');
  console.log('========================================================================\n');

  console.log(`[Host Architecture]`);
  console.log(`- CPU: ${os.cpus().length}x ${os.cpus()[0]?.model}`);
  console.log(`- RAM: ${(os.totalmem() / (1024 * 1024 * 1024)).toFixed(1)} GB`);
  console.log(`- Worker Concurrency: 20 Parallel Worker Lanes`);
  console.log(`- DB Pool Max: 30 Connections\n`);

  // STAGE 1: 1,000 Simulated Jobs
  console.log('--- [STAGE 1: 1,000 SIMULATED PUBLISHING JOBS] ---');
  const s1 = await runWorkerStage(1000, 20);
  console.log(`Ingestion: ${s1.ingestionRateJobsSec} jobs/sec | Worker Throughput: ${s1.processingThroughputJobsSec} jobs/sec`);
  console.log(`Success Rate: ${s1.successRatePct}% (${s1.successful}/${s1.jobCount}) in ${s1.processingDurationSec}s`);
  console.log(`Latency: p50 = ${s1.latencies.p50}ms | p95 = ${s1.latencies.p95}ms | p99 = ${s1.latencies.p99}ms | Max = ${s1.latencies.max}ms`);
  console.log(`Pool Saturation: ${s1.poolStats.saturationPct}% | Status: ${s1.poolStats.status}\n`);

  // STAGE 2: 5,000 Simulated Jobs
  console.log('--- [STAGE 2: 5,000 SIMULATED PUBLISHING JOBS] ---');
  const s2 = await runWorkerStage(5000, 20);
  console.log(`Ingestion: ${s2.ingestionRateJobsSec} jobs/sec | Worker Throughput: ${s2.processingThroughputJobsSec} jobs/sec`);
  console.log(`Success Rate: ${s2.successRatePct}% (${s2.successful}/${s2.jobCount}) in ${s2.processingDurationSec}s`);
  console.log(`Latency: p50 = ${s2.latencies.p50}ms | p95 = ${s2.latencies.p95}ms | p99 = ${s2.latencies.p99}ms | Max = ${s2.latencies.max}ms`);
  console.log(`Pool Saturation: ${s2.poolStats.saturationPct}% | Status: ${s2.poolStats.status}\n`);

  // STAGE 3: 10,000 Simulated Jobs
  console.log('--- [STAGE 3: 10,000 SIMULATED PUBLISHING JOBS] ---');
  const s3 = await runWorkerStage(10000, 20);
  console.log(`Ingestion: ${s3.ingestionRateJobsSec} jobs/sec | Worker Throughput: ${s3.processingThroughputJobsSec} jobs/sec`);
  console.log(`Success Rate: ${s3.successRatePct}% (${s3.successful}/${s3.jobCount}) in ${s3.processingDurationSec}s`);
  console.log(`Latency: p50 = ${s3.latencies.p50}ms | p95 = ${s3.latencies.p95}ms | p99 = ${s3.latencies.p99}ms | Max = ${s3.latencies.max}ms`);
  console.log(`Pool Saturation: ${s3.poolStats.saturationPct}% | Status: ${s3.poolStats.status}\n`);

  // STAGE 4: 25,000 Simulated Jobs (Determining Queue Lag & Backpressure)
  console.log('--- [STAGE 4: 25,000 SIMULATED PUBLISHING JOBS] ---');
  const s4 = await runWorkerStage(25000, 20);
  console.log(`Ingestion: ${s4.ingestionRateJobsSec} jobs/sec | Worker Throughput: ${s4.processingThroughputJobsSec} jobs/sec`);
  console.log(`Success Rate: ${s4.successRatePct}% (${s4.successful}/${s4.jobCount}) in ${s4.processingDurationSec}s`);
  console.log(`Latency: p50 = ${s4.latencies.p50}ms | p95 = ${s4.latencies.p95}ms | p99 = ${s4.latencies.p99}ms | Max = ${s4.latencies.max}ms`);
  console.log(`Pool Saturation: ${s4.poolStats.saturationPct}% | Status: ${s4.poolStats.status}\n`);

  // TRACK 5: Idempotency & Duplicate Prevention Stress Test
  console.log('--- [TRACK 5: DUPLICATE JOB PREVENTION & RACE CONDITION CHECK] ---');
  const testJobId = crypto.randomUUID();
  await db('publishing_jobs').insert({
    id: testJobId,
    tenant_id: validTenantId,
    brand_id: validBrandId,
    user_id: validUserId,
    post_id: null,
    platform: 'facebook',
    account_id: 'acc_dup_test',
    status: 'scheduled',
    scheduled_at: new Date(Date.now() - 1000),
    attempt_count: 0,
    max_attempts: 3,
    created_at: new Date(),
    updated_at: new Date(),
  });

  // Launch 5 workers simultaneously trying to process the EXACT same job ID
  const dupResults = await Promise.all([
    simulatePublishWorker(testJobId, 'facebook', 'acc_dup_test'),
    simulatePublishWorker(testJobId, 'facebook', 'acc_dup_test'),
    simulatePublishWorker(testJobId, 'facebook', 'acc_dup_test'),
    simulatePublishWorker(testJobId, 'facebook', 'acc_dup_test'),
    simulatePublishWorker(testJobId, 'facebook', 'acc_dup_test'),
  ]);

  const successJobs = dupResults.filter((r) => r.success);
  const skippedJobs = dupResults.filter((r) => r.skipped);

  console.log(`Concurrent Claims: 5 simultaneous workers attempted job ${testJobId}:`);
  console.log(`- Claimed & Published: ${successJobs.length} worker`);
  console.log(`- Safely Skipped / Idempotently Blocked: ${skippedJobs.length} workers`);

  const isIdempotent = successJobs.length === 1 && skippedJobs.length === 4;
  console.log(`Result: ${isIdempotent ? '✅ PASS (Strictly Idempotent - Zero Duplicate Publishing)' : '❌ FAIL (Duplicate Detected)'}`);
  await db('publishing_jobs').where({ id: testJobId }).del();

  // TRACK 6: Production Lock Final Invariant Check
  console.log('\n--- [TRACK 6: PERMANENT PRODUCTION META PUBLICATION LOCK CHECK] ---');
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

  console.log('========================================================================');
  console.log('EXTENDED STRESS TEST COMPLETE');
  console.log('========================================================================');

  await db.destroy();
}

runExtendedStressSuite().catch((err) => {
  console.error('Stress test failed:', err.sqlMessage || err.message || err);
  process.exit(1);
});
