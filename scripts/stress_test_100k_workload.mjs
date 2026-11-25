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

async function simulatePublishWorker(jobId, platform) {
  const start = Date.now();
  const now = new Date();

  // 1. Atomic claim check
  const affected = await db('publishing_jobs')
    .where({ id: jobId, status: 'scheduled' })
    .update({
      status: 'publishing',
      attempt_count: db.raw('COALESCE(attempt_count, 0) + 1'),
      updated_at: now,
    });

  if (affected === 0) {
    return { skipped: true, durationMs: Date.now() - start };
  }

  // 2. Simulated mock dispatch network jitter (2-5ms for high volume test)
  await new Promise((resolve) => setTimeout(resolve, 2 + Math.random() * 3));

  // 3. Mark complete in sandbox status
  const externalPostId = `mock_stress_100k_${platform}_${crypto.randomBytes(4).toString('hex')}`;
  await db('publishing_jobs')
    .where({ id: jobId })
    .update({
      status: 'sandbox',
      external_post_id: externalPostId,
      external_post_url: `https://${platform}.com/posts/${externalPostId}`,
      last_error: null,
      updated_at: new Date(),
    });

  return {
    success: true,
    jobId,
    durationMs: Date.now() - start,
  };
}

async function runHighScaleStage(jobCount, workerConcurrency = 25) {
  console.log(`\n========================================================================`);
  console.log(`   EXECUTING WORKLOAD STAGE: ${jobCount.toLocaleString()} SIMULATED JOBS`);
  console.log(`   Concurrency: ${workerConcurrency} worker lanes | DB Pool Max: 30`);
  console.log(`========================================================================`);

  const createdJobIds = [];
  const startCpu = process.cpuUsage();
  const startMem = process.memoryUsage();
  const stageStart = Date.now();

  try {
    // 1. Ingestion / Queue Enqueue Phase
    console.log(`[Phase 1] Ingesting ${jobCount.toLocaleString()} scheduled jobs into MySQL queue...`);
    const BATCH_INSERT = 1000;
    const insertStart = Date.now();

    for (let i = 0; i < jobCount; i += BATCH_INSERT) {
      const chunkCount = Math.min(BATCH_INSERT, jobCount - i);
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
          account_id: `acc_${platform}_mock_100k`,
          status: 'scheduled',
          scheduled_at: new Date(Date.now() - 1000),
          attempt_count: 0,
          max_attempts: 3,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
      await db('publishing_jobs').insert(rows);
      if ((i + chunkCount) % 10000 === 0 || (i + chunkCount) === jobCount) {
        process.stdout.write(`  -> Ingested ${(i + chunkCount).toLocaleString()} / ${jobCount.toLocaleString()} jobs\r`);
      }
    }
    const insertDurationSec = (Date.now() - insertStart) / 1000;
    const ingestionRate = Number((jobCount / insertDurationSec).toFixed(1));
    console.log(`\n  ✓ Ingestion Complete: ${jobCount.toLocaleString()} jobs in ${insertDurationSec.toFixed(2)}s (${ingestionRate} jobs/sec)`);

    // 2. Queue Backlog Clearance & Worker Execution Phase
    console.log(`[Phase 2] Draining backlog with ${workerConcurrency} parallel worker lanes...`);
    const processingStart = Date.now();
    const sampledLatencies = [];
    let processed = 0;
    let successful = 0;
    let skipped = 0;
    let jobIndex = 0;
    let peakSaturation = 0;

    async function workerLane() {
      while (true) {
        const idx = jobIndex++;
        if (idx >= createdJobIds.length) break;

        const jId = createdJobIds[idx];
        const platform = idx % 2 === 0 ? 'facebook' : 'instagram';
        const res = await simulatePublishWorker(jId, platform);

        // Sample 1 out of every 50 jobs for latency stats to conserve memory
        if (idx % 50 === 0) {
          sampledLatencies.push(res.durationMs);
          const pool = getPoolStats();
          if (pool.saturationPct > peakSaturation) {
            peakSaturation = pool.saturationPct;
          }
        }

        processed++;
        if (res.success) successful++;
        if (res.skipped) skipped++;

        if (processed % 5000 === 0 || processed === jobCount) {
          const elapsedSec = (Date.now() - processingStart) / 1000;
          const currentThroughput = (processed / elapsedSec).toFixed(1);
          process.stdout.write(`  -> Cleared ${processed.toLocaleString()} / ${jobCount.toLocaleString()} jobs (${currentThroughput} jobs/sec, peak saturation: ${peakSaturation}%)\r`);
        }
      }
    }

    const lanes = [];
    for (let l = 0; l < workerConcurrency; l++) {
      lanes.push(workerLane());
    }
    await Promise.all(lanes);

    const processingDurationSec = (Date.now() - processingStart) / 1000;
    const clearanceThroughput = Number((successful / processingDurationSec).toFixed(1));
    const stats = calculatePercentiles(sampledLatencies);

    const endCpu = process.cpuUsage(startCpu);
    const endMem = process.memoryUsage();
    const cpuPercent = Number(((endCpu.user + endCpu.system) / ((Date.now() - stageStart) * 1000) * 100).toFixed(1));
    const finalPool = getPoolStats();

    console.log(`\n  ✓ Queue Clearance Complete: ${successful.toLocaleString()} jobs cleared in ${processingDurationSec.toFixed(2)}s`);
    console.log(`    - Throughput: ${clearanceThroughput} jobs/sec`);
    console.log(`    - Latency (Sampled p50/p95/p99): p50=${stats.p50}ms, p95=${stats.p95}ms, p99=${stats.p99}ms, max=${stats.max}ms`);
    console.log(`    - Peak Pool Saturation: ${peakSaturation}% | Final Status: ${finalPool.status}`);
    console.log(`    - CPU Usage: ${cpuPercent}% | RSS Memory: ${(endMem.rss / (1024 * 1024)).toFixed(1)} MB`);

    return {
      jobCount,
      workerConcurrency,
      ingestionRateJobsSec: ingestionRate,
      clearanceThroughputJobsSec: clearanceThroughput,
      clearanceDurationSec: Number(processingDurationSec.toFixed(2)),
      successful,
      skipped,
      successRatePct: Number(((successful / jobCount) * 100).toFixed(2)),
      latencies: stats,
      peakSaturation,
      cpuPercent,
      rssMb: Number((endMem.rss / (1024 * 1024)).toFixed(1)),
    };
  } finally {
    // Teardown: Safely prune synthetic stress test jobs in chunks of 2,000
    console.log(`[Teardown] Cleaning up synthetic test jobs...`);
    if (createdJobIds.length > 0) {
      const CHUNK_DELETE = 2000;
      for (let d = 0; d < createdJobIds.length; d += CHUNK_DELETE) {
        const toDelete = createdJobIds.slice(d, d + CHUNK_DELETE);
        await db('publishing_jobs').whereIn('id', toDelete).del();
      }
    }
    console.log(`  ✓ Cleanup finished.`);
  }
}

async function runSuite() {
  await initContext();

  console.log('************************************************************************');
  console.log('   SOCIALFORGE: 50,000 & 100,000 WORKLOAD STRESS & BACKLOG ANALYSIS    ');
  console.log('************************************************************************');
  console.log(`Host CPU: ${os.cpus().length} cores | Memory: ${(os.totalmem() / (1024**3)).toFixed(1)} GB`);

  // Stage 5: 50,000 simulated jobs
  const res50k = await runHighScaleStage(50000, 25);

  // Stage 6: 100,000 simulated jobs
  const res100k = await runHighScaleStage(100000, 25);

  // Verification of production lock invariant
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
  console.log('   FINAL SUMMARY: 50K & 100K WORKLOAD RESULTS');
  console.log('************************************************************************');
  console.log(`50,000 Workload: ${res50k.clearanceThroughputJobsSec} jobs/sec | Clearance: ${res50k.clearanceDurationSec}s | p95=${res50k.latencies.p95}ms | Saturation=${res50k.peakSaturation}%`);
  console.log(`100,000 Workload: ${res100k.clearanceThroughputJobsSec} jobs/sec | Clearance: ${res100k.clearanceDurationSec}s | p95=${res100k.latencies.p95}ms | Saturation=${res100k.peakSaturation}%`);
  console.log('************************************************************************\n');

  await db.destroy();
}

runSuite().catch((err) => {
  console.error('High scale stress test failed:', err.sqlMessage || err.message || err);
  process.exit(1);
});
