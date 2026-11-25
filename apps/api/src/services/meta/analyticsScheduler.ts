import { db } from '../../db/connection.js';
import { MetaAnalyticsSyncService } from './analyticsSync.js';

export class MetaAnalyticsScheduler {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;

  /**
   * Starts automatic background analytics sync timer.
   * Runs an initial incremental check, then repeats at intervalMs.
   */
  public static start(options: { intervalMs?: number } = {}): void {
    if (this.timer) {
      return;
    }

    const intervalMs = options.intervalMs || 15 * 60 * 1000; // 15 minutes default
    console.log(`[MetaAnalyticsScheduler] Background auto-sync scheduler active (interval: ${intervalMs / 1000}s).`);

    // Initial check shortly after startup
    setTimeout(() => {
      this.runSyncCycle().catch((err) => {
        console.error('[MetaAnalyticsScheduler] Initial sync cycle error:', err);
      });
    }, 6000);

    this.timer = setInterval(() => {
      this.runSyncCycle().catch((err) => {
        console.error('[MetaAnalyticsScheduler] Recurring sync cycle error:', err);
      });
    }, intervalMs);
  }

  /**
   * Stops the background scheduler timer.
   */
  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('[MetaAnalyticsScheduler] Background auto-sync scheduler stopped.');
    }
  }

  /**
   * Executes a single safe incremental sync cycle across all connected brands.
   */
  public static async runSyncCycle(): Promise<{
    brandsChecked: number;
    brandsSynced: number;
    errors: string[];
  }> {
    if (this.isRunning) {
      return { brandsChecked: 0, brandsSynced: 0, errors: ['Sync cycle already running'] };
    }

    this.isRunning = true;
    try {
      const activeConnections = await db('meta_connections')
        .where('status', 'connected')
        .select('id', 'brand_id');

      let brandsSynced = 0;
      const errors: string[] = [];

      for (const conn of activeConnections) {
        try {
          const res = await MetaAnalyticsSyncService.syncBrandAnalytics(conn.brand_id, {
            force: false, // Incremental sync (respects rate-limit cooldown)
          });

          if (res.syncedCount > 0) {
            brandsSynced++;
          }

          // Gentle pacing between brands to avoid burst traffic
          await new Promise((resolve) => setTimeout(resolve, 250));
        } catch (err: any) {
          errors.push(`Brand ${conn.brand_id}: ${err.message}`);
        }
      }

      return {
        brandsChecked: activeConnections.length,
        brandsSynced,
        errors,
      };
    } finally {
      this.isRunning = false;
    }
  }
}
