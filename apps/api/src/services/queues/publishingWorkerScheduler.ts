import { db } from '../../db/connection.js';
import { executePublishPost } from '../../controllers/post.controller.js';
import { isRealExternalPostId } from '@socialforge/shared';

export interface SchedulerMetrics {
  totalProcessed: number;
  successfulPublished: number;
  failedPublished: number;
  lastRunAt: Date | null;
  isRunning: boolean;
}

export class PublishingWorkerScheduler {
  private static timer: NodeJS.Timeout | null = null;
  private static isProcessing = false;
  private static metrics: SchedulerMetrics = {
    totalProcessed: 0,
    successfulPublished: 0,
    failedPublished: 0,
    lastRunAt: null,
    isRunning: false,
  };

  /**
   * Starts the background queue worker scheduler (polls every 5 seconds).
   */
  public static start(intervalMs = 5000): void {
    if (this.timer) {
      return;
    }
    console.log(`[PublishingWorkerScheduler] Starting automated queue poller (interval: ${intervalMs}ms)...`);
    this.timer = setInterval(() => {
      this.poll().catch((err) => {
        console.error('[PublishingWorkerScheduler] Error during scheduled poll tick:', err?.message || err);
      });
    }, intervalMs);
    // Trigger initial poll immediately
    this.poll().catch(() => {});
  }

  /**
   * Stops the background queue worker scheduler.
   */
  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[PublishingWorkerScheduler] Background queue poller stopped.');
    }
  }

  public static getMetrics(): SchedulerMetrics {
    return { ...this.metrics };
  }

  /**
   * Directly triggers one cycle of due post / job execution.
   * Useful for deterministic testing, immediate flushes, and background cron loops.
   */
  public static async processDuePosts(): Promise<{ postsProcessed: number; jobsProcessed: number }> {
    return await this.poll();
  }

  /**
   * Core poll implementation:
   * 1. Acquires atomic lock on due scheduled posts (scheduled_for <= NOW()).
   * 2. Dispatches posts via executePublishPost.
   * 3. Syncs and processes due / retry publishing_jobs records with exponential backoff.
   */
  private static async poll(): Promise<{ postsProcessed: number; jobsProcessed: number }> {
    if (this.isProcessing) {
      return { postsProcessed: 0, jobsProcessed: 0 };
    }

    this.isProcessing = true;
    this.metrics.isRunning = true;
    this.metrics.lastRunAt = new Date();

    let postsProcessed = 0;
    let jobsProcessed = 0;

    try {
      const now = new Date();

      // -------------------------------------------------------------
      // 1. Process Due Posts from 'posts' table
      // -------------------------------------------------------------
      const duePosts = await db('posts')
        .where('status', 'scheduled')
        .andWhere('scheduled_for', '<=', now)
        .orderBy('scheduled_for', 'asc')
        .limit(20)
        .select('id', 'brand_id', 'tenant_id', 'title');

      for (const post of duePosts) {
        // Atomic lock: Only transition if still 'scheduled' to prevent duplicate execution across workers
        const acquired = await db('posts')
          .where({ id: post.id, status: 'scheduled' })
          .update({
            status: 'publishing',
            updated_at: now,
          });

        if (acquired === 0) {
          // Another worker instance claimed this post
          continue;
        }

        try {
          console.log(`[PublishingWorkerScheduler] 🚀 Dispatching due scheduled post: ${post.id} ("${post.title || 'Untitled'}")`);
          const publishResult = await executePublishPost(post.id, post.brand_id, post.tenant_id, { force: true });

          postsProcessed++;
          if (publishResult.success) {
            this.metrics.successfulPublished++;
            console.log(`[PublishingWorkerScheduler] ✅ Successfully published post ${post.id} (Status: ${publishResult.status || 'published'})`);
          } else {
            this.metrics.failedPublished++;
            console.warn(`[PublishingWorkerScheduler] ⚠️ Post ${post.id} partially published or returned warning:`, publishResult.message);
          }
        } catch (execErr: any) {
          this.metrics.failedPublished++;
          console.error(`[PublishingWorkerScheduler] ❌ Failed to publish post ${post.id}:`, execErr?.message || execErr);

          // Mark post as failed if not already updated
          await db('posts')
            .where({ id: post.id, status: 'publishing' })
            .update({
              status: 'failed',
              updated_at: new Date(),
            });
        }
      }

      // -------------------------------------------------------------
      // 2. Process Due Unified Publishing Jobs from 'publishing_jobs'
      // -------------------------------------------------------------
      const dueJobs = await db('publishing_jobs')
        .where('status', 'scheduled')
        .andWhere('scheduled_at', '<=', now)
        .orderBy('scheduled_at', 'asc')
        .limit(20)
        .select('*');

      for (const job of dueJobs) {
        const attempt = (job.attempt_count || 0) + 1;
        const jobAcquired = await db('publishing_jobs')
          .where({ id: job.id, status: 'scheduled' })
          .update({
            status: 'publishing',
            attempt_count: attempt,
            updated_at: now,
          });

        if (jobAcquired === 0) {
          continue;
        }

        try {
          if (job.post_id) {
            console.log(`[PublishingWorkerScheduler] Processing publishing job ${job.id} for post ${job.post_id}`);
            const result = await executePublishPost(job.post_id, job.brand_id, job.tenant_id, { force: true });
            const variant = result.variants?.find((v: any) => v.platform === job.platform);

            await db('publishing_jobs')
              .where({ id: job.id })
              .update({
                status: variant?.status === 'published' ? 'published' : 'failed',
                external_post_id: variant?.remote_post_id || null,
                external_post_url: variant?.remote_post_url || null,
                updated_at: new Date(),
              });
            jobsProcessed++;
          }
        } catch (jobErr: any) {
          const maxAttempts = job.max_attempts || 3;
          const willRetry = attempt < maxAttempts;
          // Exponential backoff: 10s * 2^(attempt - 1)
          const delaySeconds = 10 * Math.pow(2, attempt - 1);
          const nextRetry = willRetry ? new Date(Date.now() + delaySeconds * 1000) : null;

          await db('publishing_jobs')
            .where({ id: job.id })
            .update({
              status: willRetry ? 'failed' : 'permanently_failed',
              next_retry_at: nextRetry,
              last_error: jobErr?.message || String(jobErr),
              updated_at: new Date(),
            });
        }
      }

      // -------------------------------------------------------------
      // 3. Retry Processor for Transient Failed Jobs with Exponential Backoff
      // -------------------------------------------------------------
      const retryJobs = await db('publishing_jobs')
        .where('status', 'failed')
        .andWhere('next_retry_at', '<=', now)
        .andWhereRaw('attempt_count < max_attempts')
        .limit(10)
        .select('*');

      for (const retryJob of retryJobs) {
        console.log(`[PublishingWorkerScheduler] 🔄 Retrying failed publishing job ${retryJob.id} (Attempt: ${retryJob.attempt_count + 1}/${retryJob.max_attempts})`);
        const retryAcquired = await db('publishing_jobs')
          .where({ id: retryJob.id, status: 'failed' })
          .update({
            status: 'scheduled',
            scheduled_at: now,
            updated_at: now,
          });

        if (retryAcquired > 0) {
          jobsProcessed++;
        }
      }

      this.metrics.totalProcessed += postsProcessed + jobsProcessed;
    } catch (pollErr: any) {
      console.error('[PublishingWorkerScheduler] Unexpected error during queue poll cycle:', pollErr?.message || pollErr);
    } finally {
      this.isProcessing = false;
      this.metrics.isRunning = false;
    }

    return { postsProcessed, jobsProcessed };
  }
}
