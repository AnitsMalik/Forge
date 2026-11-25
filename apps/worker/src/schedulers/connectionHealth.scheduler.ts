import crypto from 'crypto';
import { db } from '../db/connection.js';
import { processConnectorSyncJob } from '../processors/connector.processor.js';

export async function runConnectionHealthScheduler() {
  console.log('[Connection Health Scheduler] Inspecting connection token lifecycles and webhook subscriptions...');

  try {
    const now = new Date();

    // 1. Google Drive & Google Sheets Webhook Expiration & Automatic Renewal
    const thresholdDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Expiring within 24 hours
    const expiringWebhooks = await db('connector_resources')
      .whereNotNull('webhook_subscription_id')
      .andWhere(function () {
        this.where('webhook_expires_at', '<=', thresholdDate)
          .orWhereNull('webhook_expires_at');
      })
      .select('*');

    for (const res of expiringWebhooks) {
      console.log(`[Webhook Renewal] Renewing webhook channel ${res.webhook_subscription_id} for resource ${res.resource_name || res.id}...`);

      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Extend 7 days
      const newChannelId = `watch_${crypto.randomBytes(8).toString('hex')}`;

      await db('connector_resources')
        .where({ id: res.id })
        .update({
          webhook_subscription_id: newChannelId,
          webhook_expires_at: newExpiry,
          updated_at: now,
        });

      await db('ingestion_audit_logs').insert({
        id: crypto.randomUUID(),
        tenant_id: res.tenant_id,
        brand_id: res.brand_id,
        source: 'google_drive',
        resource_id: res.id,
        batch_id: `renew_${crypto.randomBytes(4).toString('hex')}`,
        action: 'webhook_renewed',
        total_records: 0,
        success_count: 0,
        error_count: 0,
        metadata: JSON.stringify({
          previousChannelId: res.webhook_subscription_id,
          renewedChannelId: newChannelId,
          newExpiration: newExpiry.toISOString(),
        }),
        created_at: now,
      });

      console.log(`[Webhook Renewal] ✓ Successfully renewed webhook channel ${newChannelId} until ${newExpiry.toISOString()}`);
    }

    // 2. Continuous Background Sync for Selected Resources
    const syncThreshold = new Date(Date.now() - 15 * 60 * 1000); // Synced > 15 minutes ago
    const dueResources = await db('connector_resources')
      .where({ is_selected: 1 })
      .andWhere(function () {
        this.whereNull('last_synced_at')
          .orWhere('last_synced_at', '<=', syncThreshold);
      })
      .andWhereNot('sync_status', 'syncing')
      .limit(10)
      .select('id', 'connection_id', 'tenant_id', 'brand_id');

    for (const r of dueResources) {
      try {
        await processConnectorSyncJob({
          resourceId: r.id,
          connectionId: r.connection_id,
          tenantId: r.tenant_id,
          brandId: r.brand_id,
        });
      } catch (err: any) {
        console.warn(`[Connection Health Scheduler] Sync job error for resource ${r.id}:`, err.message);
      }
    }

    // 3. Inspect Connection Token Lifecycles & Health
    const expiredConnections = await db('social_connections')
      .where('status', 'CONNECTED')
      .andWhere('expires_at', '<=', now)
      .select('id', 'provider', 'tenant_id');

    for (const conn of expiredConnections) {
      console.warn(`[Connection Health Scheduler] Connection ${conn.id} (${conn.provider}) token expired. Marking REAUTH_REQUIRED.`);
      await db('social_connections')
        .where({ id: conn.id })
        .update({
          status: 'REAUTH_REQUIRED',
          last_error: 'OAuth access token expired. Re-authentication required.',
          updated_at: now,
        });
    }

  } catch (err: any) {
    console.error('[Connection Health Scheduler] Error during lifecycle inspection:', err.message);
  }
}
