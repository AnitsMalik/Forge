import { Queue, QueueOptions } from 'bullmq';
import { QUEUE_NAMES } from '@socialforge/shared';
import { config } from '../config/index.js';

export const PUBLISHING_QUEUE_NAME = QUEUE_NAMES.PUBLISH_DISPATCHER.replace(/:/g, '-');

export interface PublishingJobData {
  jobId: string;
  tenantId: string;
  brandId: string;
  platform: string;
  accountId: string;
  scheduledAt?: Date | string;
}

let publishingQueue: Queue<PublishingJobData> | null = null;

export function getPublishingQueue(): Queue<PublishingJobData> | null {
  if (publishingQueue) return publishingQueue;

  if (process.env.USE_BULLMQ_PUBLISHING === 'false') {
    return null;
  }

  try {
    const queueOptions: QueueOptions = {
      connection: {
        host: config.redis.host || '127.0.0.1',
        port: config.redis.port || 6379,
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

    publishingQueue = new Queue<PublishingJobData>(PUBLISHING_QUEUE_NAME, queueOptions);
    return publishingQueue;
  } catch (err) {
    console.warn('[PublishingQueue] Failed to initialize BullMQ queue:', err);
    return null;
  }
}

export async function enqueuePublishingJob(
  jobData: PublishingJobData,
  options: { delayMs?: number; priority?: number } = {}
) {
  const queue = getPublishingQueue();
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
}

export async function closePublishingQueue() {
  if (publishingQueue) {
    await publishingQueue.close();
    publishingQueue = null;
  }
}
