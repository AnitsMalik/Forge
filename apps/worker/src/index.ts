import { db } from './db/connection.js';
import { processPublishJob, processUnifiedPublishingJob } from './processors/publishProcessor.js';
import { processVideoRenderJob } from './processors/videoProcessor.js';
import { processAnalyticsJob } from './processors/analyticsProcessor.js';
import { processDunningEvaluation } from './processors/dunningProcessor.js';
import { processAutomationJob } from './processors/automation.processor.js';
import { runAutomationScheduler } from './schedulers/automation.scheduler.js';
import { runConnectionHealthScheduler } from './schedulers/connectionHealth.scheduler.js';
import { AUTOMATION_QUEUE_NAME } from './queues/automation.queue.js';
import { generateContent } from './engines/ai/promptBuilder.js';
import { QUEUE_NAMES } from '@socialforge/shared';
import { Redis } from 'ioredis';
import { Worker } from 'bullmq';
import { config } from './config/index.js';

console.log('=========================================');
console.log('  SocialForge Worker Service Starting');
console.log('  Database: MySQL 9.3 (:3308)');
console.log('=========================================');

// 1. Attempt Redis BullMQ Connection
let redisClient: Redis | null = null;
let publishWorker: Worker | null = null;
let videoWorker: Worker | null = null;
let analyticsWorker: Worker | null = null;
let automationWorker: Worker | null = null;

let isBullMQActive = false;

try {
  redisClient = new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 2000,
    retryStrategy: (times) => {
      if (times > 5) return null;
      return Math.min(times * 1000, 3000);
    },
  });

  redisClient.on('error', () => {
    isBullMQActive = false;
  });

  redisClient.on('close', () => {
    isBullMQActive = false;
  });

  redisClient
    .connect()
    .then(() => {
      console.log('[Worker] Connected to Redis. Initializing BullMQ workers...');
      isBullMQActive = true;

      publishWorker = new Worker(
        QUEUE_NAMES.PUBLISH_DISPATCHER.replace(/:/g, '-'),
        async (job) => {
          if (job.data?.jobId) {
            return await processUnifiedPublishingJob(job.data.jobId);
          } else if (job.data?.postId) {
            return await processPublishJob(job.data);
          }
        },
        {
          connection: redisClient as any,
          concurrency: 20,
        }
      );

      publishWorker.on('completed', (job) => {
        console.log(`[Worker] BullMQ Publish Job ${job.id} completed.`);
      });

      publishWorker.on('failed', (job, err) => {
        console.error(`[Worker] BullMQ Publish Job ${job?.id} failed:`, err);
      });

      // Video Rendering Worker with strict concurrency of 2 to preserve CPU stability
      videoWorker = new Worker(
        QUEUE_NAMES.RENDER_VIDEO,
        async (job) => {
          return await processVideoRenderJob(job.data);
        },
        {
          connection: redisClient as any,
          concurrency: 2,
        }
      );

      videoWorker.on('completed', (job) => {
        console.log(`[Worker] BullMQ Video Render Job ${job.id} completed.`);
      });

      videoWorker.on('failed', (job, err) => {
        console.error(`[Worker] BullMQ Video Render Job ${job?.id} failed:`, err);
      });

      // Analytics Ingestion Worker
      analyticsWorker = new Worker(
        QUEUE_NAMES.ANALYTICS_SYNC,
        async (job) => {
          return await processAnalyticsJob(job.data);
        },
        {
          connection: redisClient as any,
        }
      );

      analyticsWorker.on('completed', (job) => {
        console.log(`[Worker] BullMQ Analytics Sync Job ${job.id} completed.`);
      });

      analyticsWorker.on('failed', (job, err) => {
        console.error(`[Worker] BullMQ Analytics Sync Job ${job?.id} failed:`, err);
      });

      // Automation Dispatcher Worker
      automationWorker = new Worker(
        AUTOMATION_QUEUE_NAME,
        async (job) => {
          return await processAutomationJob(job.data);
        },
        {
          connection: redisClient as any,
        }
      );

      automationWorker.on('completed', (job) => {
        console.log(`[Worker] BullMQ Automation Job ${job.id} completed.`);
      });

      automationWorker.on('failed', (job, err) => {
        console.error(`[Worker] BullMQ Automation Job ${job?.id} failed:`, err);
      });
    })
    .catch(() => {
      console.log('[Worker] Redis not detected on localhost:6379.');
      console.log('[Worker] Operating in High-Availability Direct MySQL Scheduler mode.');
    });
} catch (err) {
  console.log('[Worker] Redis skipped in local environment.');
}

// 2. Scheduled Posts Poller (Every 5 seconds)
// Dispatches any post where scheduled_for <= NOW() and status = 'scheduled'
async function pollScheduledPosts() {
  try {
    const duePosts = await db('posts')
      .where('status', 'scheduled')
      .andWhere('scheduled_for', '<=', new Date())
      .select('id', 'brand_id');

    for (const post of duePosts) {
      console.log(`[Worker Scheduler] Found due post ${post.id}. Triggering publication...`);
      await processPublishJob({ postId: post.id, brandId: post.brand_id });
    }
  } catch (err) {
    console.error('[Worker Scheduler] Error checking due posts:', err);
  }
}

// Helper for bounded concurrent batch execution
async function processJobBatchConcurrently(jobIds: string[], concurrency = 10) {
  for (let i = 0; i < jobIds.length; i += concurrency) {
    const chunk = jobIds.slice(i, i + concurrency);
    await Promise.allSettled(chunk.map((id) => processUnifiedPublishingJob(id)));
  }
}

// 2b. Unified Publishing Jobs & Retries Poller (Every 5 seconds with concurrent batching and reconciliation)
async function pollPublishingJobs() {
  try {
    const now = new Date();
    const BATCH_SIZE = 100;

    // When BullMQ is active, pollPublishingJobs operates as a Reconciliation Engine for stranded jobs
    const query = db('publishing_jobs')
      .where('status', 'scheduled')
      .limit(BATCH_SIZE)
      .select('id');

    if (isBullMQActive) {
      // Pick up any stranded jobs older than 15 seconds that missed BullMQ queueing
      query.andWhere('scheduled_at', '<=', new Date(now.getTime() - 15000));
    } else {
      query.andWhere('scheduled_at', '<=', now);
    }

    const dueJobs = await query;
    if (dueJobs.length > 0) {
      const jobIds = dueJobs.map((j) => j.id);
      await processJobBatchConcurrently(jobIds, 10);
    }

    // Process retry candidates with bounded retry backoff
    const retryJobs = await db('publishing_jobs')
      .where('status', 'failed')
      .andWhere('next_retry_at', '<=', now)
      .andWhereRaw('attempt_count < max_attempts')
      .limit(BATCH_SIZE)
      .select('id');

    if (retryJobs.length > 0) {
      const retryIds = retryJobs.map((r) => r.id);
      await processJobBatchConcurrently(retryIds, 10);
    }
  } catch (err) {
    console.error('[Worker Publishing Scheduler] Error checking due publishing jobs:', err);
  }
}

const schedulerInterval = setInterval(() => {
  pollScheduledPosts();
  pollPublishingJobs();
}, 5000);
console.log('[Worker] Scheduled Publishing Dispatcher active (polling interval: 5s).');

// 2c. Scheduled Automations & Pending Workflow Evaluator (Every 10 seconds)
const automationSchedulerInterval = setInterval(() => {
  runAutomationScheduler();
}, 10000);
console.log('[Worker] Workflow Automation Scheduler active (polling interval: 10s).');

// 3. Periodic Analytics Telemetry Sync (Every 60 seconds)
async function periodicAnalyticsSync() {
  try {
    await processAnalyticsJob({ generateHistory: false });
  } catch (err) {
    console.error('[Worker Analytics Poller] Error executing periodic sync:', err);
  }
}

const analyticsInterval = setInterval(periodicAnalyticsSync, 60000);
console.log('[Worker] Periodic Analytics Telemetry Poller active (interval: 60s).');

// 4. Periodic Dunning & Billing Grace Period Evaluator (Every 60 seconds)
async function periodicDunningCheck() {
  try {
    await processDunningEvaluation();
  } catch (err) {
    console.error('[Worker Dunning Poller] Error executing periodic check:', err);
  }
}

const dunningInterval = setInterval(periodicDunningCheck, 60000);
console.log('[Worker] Periodic Dunning & Grace Period Poller active (interval: 60s).');

// 5. Periodic Connection Health, Token Freshness & Webhook Renewal (Every 30 seconds)
const connectionHealthInterval = setInterval(() => {
  runConnectionHealthScheduler();
}, 30000);
console.log('[Worker] Connection Health & Webhook Renewal Scheduler active (interval: 30s).');

// Clean Shutdown
process.on('SIGTERM', () => {
  console.log('Stopping worker...');
  clearInterval(schedulerInterval);
  clearInterval(automationSchedulerInterval);
  clearInterval(analyticsInterval);
  clearInterval(dunningInterval);
  clearInterval(connectionHealthInterval);
  if (publishWorker) publishWorker.close();
  if (videoWorker) videoWorker.close();
  if (analyticsWorker) analyticsWorker.close();
  if (automationWorker) automationWorker.close();
  if (redisClient) redisClient.disconnect();
  process.exit(0);
});
