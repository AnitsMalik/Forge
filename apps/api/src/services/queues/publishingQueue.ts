import { Queue, QueueOptions } from 'bullmq';
import { QUEUE_NAMES } from '@socialforge/shared';
import { config } from '../../config/index.js';

export const PUBLISHING_QUEUE_NAME = QUEUE_NAMES.PUBLISH_DISPATCHER.replace(/:/g, '-');

export interface PublishingJobData {
  jobId: string;
  tenantId: string;
  brandId: string;
  platform: string;
  accountId: string;
  scheduledAt?: Date | string;
}

let publishingQueueInstance: Queue<PublishingJobData> | null = null;

export function getApiPublishingQueue(): Queue<PublishingJobData> | null {
  if (publishingQueueInstance) {
    return publishingQueueInstance;
  }

  if (process.env.USE_BULLMQ_PUBLISHING === 'false') {
    return null;
  }

  try {
    const queueOptions: QueueOptions = {
      connection: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        maxRetriesPerRequest: null,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    };

    publishingQueueInstance = new Queue<PublishingJobData>(PUBLISHING_QUEUE_NAME, queueOptions);
    return publishingQueueInstance;
  } catch (err) {
    console.warn('[ApiPublishingQueue] Failed to initialize BullMQ queue:', err);
    return null;
  }
}

/**
 * Enqueues a publishing job into BullMQ with deduplication and optional delay.
 * Safe fallback: returns null if Redis is offline (MySQL remains authoritative).
 */
export async function enqueuePublishingJob(
  jobData: PublishingJobData,
  options: { delayMs?: number; priority?: number } = {}
) {
  if (process.env.USE_BULLMQ_PUBLISHING === 'false') {
    return null;
  }

  try {
    const queue = getApiPublishingQueue();
    if (!queue) {
      return null;
    }

    return await queue.add(
      'publish',
      jobData,
      {
        jobId: jobData.jobId, // Durable deduplication key: BullMQ will never accept duplicate entries for identical jobId
        delay: options.delayMs || 0,
        priority: options.priority || 0,
      }
    );
  } catch (err) {
    console.warn(`[ApiPublishingQueue] Failed to enqueue job ${jobData.jobId} to BullMQ; MySQL poller will reconcile:`, err);
    return null;
  }
}

export async function closeApiPublishingQueue() {
  if (publishingQueueInstance) {
    await publishingQueueInstance.close();
    publishingQueueInstance = null;
  }
}
