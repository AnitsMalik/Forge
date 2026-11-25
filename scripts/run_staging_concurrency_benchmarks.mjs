import http from 'http';
import https from 'https';
import os from 'os';
import dotenv from 'dotenv';
dotenv.config();

import { db, getPoolStats } from '../apps/api/dist/db/connection.js';

http.globalAgent.maxSockets = 25000;
https.globalAgent.maxSockets = 25000;

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

async function runStage(concurrency, totalRequests, endpointUrl) {
  const startCpu = process.cpuUsage();
  const startMem = process.memoryUsage();
  const startTime = Date.now();

  const latencies = [];
  const errors = {};
  let completed = 0;
  let successful = 0;
  let failed = 0;
  let requestIndex = 0;

  async function executeRequest() {
    const reqStart = Date.now();
    return new Promise((resolve) => {
      const parsedUrl = new URL(endpointUrl);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Connection': 'keep-alive',
          'x-bypass-rate-limit': 'test-runner',
        },
        timeout: 15000,
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const duration = Date.now() - reqStart;
          latencies.push(duration);
          completed++;

          if (res.statusCode >= 200 && res.statusCode < 400) {
            successful++;
          } else {
            failed++;
            const errKey = `HTTP_${res.statusCode}`;
            errors[errKey] = (errors[errKey] || 0) + 1;
          }
          resolve();
        });
      });

      req.on('error', (err) => {
        const duration = Date.now() - reqStart;
        latencies.push(duration);
        completed++;
        failed++;
        const errCode = err.code || 'UNKNOWN_ERR';
        errors[errCode] = (errors[errCode] || 0) + 1;
        resolve();
      });

      req.on('timeout', () => {
        req.destroy();
        const duration = Date.now() - reqStart;
        latencies.push(duration);
        completed++;
        failed++;
        errors['ETIMEDOUT'] = (errors['ETIMEDOUT'] || 0) + 1;
        resolve();
      });

      req.end();
    });
  }

  const workers = [];
  for (let c = 0; c < concurrency; c++) {
    workers.push((async () => {
      while (requestIndex < totalRequests) {
        requestIndex++;
        await executeRequest();
      }
    })());
  }

  await Promise.all(workers);

  const durationMs = Date.now() - startTime;
  const durationSec = durationMs / 1000;
  const throughput = Number((totalRequests / durationSec).toFixed(2));
  const stats = calculatePercentiles(latencies);

  const endCpu = process.cpuUsage(startCpu);
  const endMem = process.memoryUsage();
  const cpuPercent = Number(((endCpu.user + endCpu.system) / (durationMs * 1000) * 100).toFixed(1));
  const rssMb = Number((endMem.rss / (1024 * 1024)).toFixed(2));
  const poolStats = getPoolStats();

  return {
    concurrency,
    totalRequests,
    durationSec: Number(durationSec.toFixed(2)),
    throughputReqSec: throughput,
    successful,
    failed,
    successRatePct: Number(((successful / totalRequests) * 100).toFixed(2)),
    latencies: stats,
    errors,
    cpuPercent,
    rssMb,
    poolStats,
  };
}

async function benchmark() {
  console.log('========================================================================');
  console.log('   POST-OPTIMIZATION STAGED CONCURRENCY BENCHMARK                       ');
  console.log('========================================================================\n');

  const brandId = '52f09a1e-e490-4c01-9674-4eb729bd5108';
  const endpoint = `http://localhost:4000/api/v1/integrations/meta/connect?brandId=${brandId}&format=json`;

  // Stage 1: 1,000 Concurrent Attempts
  console.log('--- [STAGE 1: 1,000 CONCURRENT CONNECTION ATTEMPTS] ---');
  const s1 = await runStage(1000, 1000, endpoint);
  console.log(`Throughput: ${s1.throughputReqSec} req/s | Success Rate: ${s1.successRatePct}% (${s1.successful}/${s1.totalRequests})`);
  console.log(`Latency: p50 = ${s1.latencies.p50}ms | p95 = ${s1.latencies.p95}ms | p99 = ${s1.latencies.p99}ms | Max = ${s1.latencies.max}ms`);
  console.log(`Errors:`, Object.keys(s1.errors).length > 0 ? s1.errors : 'None (0 errors)');
  console.log(`Pool: saturation = ${s1.poolStats.saturationPct}%, used = ${s1.poolStats.numUsed}, free = ${s1.poolStats.numFree}, status = ${s1.poolStats.status}\n`);

  // Stage 2: 2,500 Concurrent Attempts
  console.log('--- [STAGE 2: 2,500 CONCURRENT CONNECTION ATTEMPTS] ---');
  const s2 = await runStage(2500, 2500, endpoint);
  console.log(`Throughput: ${s2.throughputReqSec} req/s | Success Rate: ${s2.successRatePct}% (${s2.successful}/${s2.totalRequests})`);
  console.log(`Latency: p50 = ${s2.latencies.p50}ms | p95 = ${s2.latencies.p95}ms | p99 = ${s2.latencies.p99}ms | Max = ${s2.latencies.max}ms`);
  console.log(`Errors:`, Object.keys(s2.errors).length > 0 ? s2.errors : 'None (0 errors)');
  console.log(`Pool: saturation = ${s2.poolStats.saturationPct}%, used = ${s2.poolStats.numUsed}, free = ${s2.poolStats.numFree}, status = ${s2.poolStats.status}\n`);

  // Stage 3: 5,000 Concurrent Attempts (With optimized pool max: 30)
  console.log('--- [STAGE 3: 5,000 CONCURRENT CONNECTION ATTEMPTS] ---');
  const s3 = await runStage(5000, 5000, endpoint);
  console.log(`Throughput: ${s3.throughputReqSec} req/s | Success Rate: ${s3.successRatePct}% (${s3.successful}/${s3.totalRequests})`);
  console.log(`Latency: p50 = ${s3.latencies.p50}ms | p95 = ${s3.latencies.p95}ms | p99 = ${s3.latencies.p99}ms | Max = ${s3.latencies.max}ms`);
  console.log(`Errors:`, Object.keys(s3.errors).length > 0 ? s3.errors : 'None (0 errors)');
  console.log(`Pool: saturation = ${s3.poolStats.saturationPct}%, used = ${s3.poolStats.numUsed}, free = ${s3.poolStats.numFree}, status = ${s3.poolStats.status}\n`);

  console.log('========================================================================');
  console.log('BENCHMARK COMPLETE');
  console.log('========================================================================');

  await db.destroy();
}

benchmark().catch((e) => {
  console.error(e);
  process.exit(1);
});
