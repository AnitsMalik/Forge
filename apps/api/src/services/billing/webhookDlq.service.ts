import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { StripeBillingService } from '../stripeBilling.service.js';
import type {
  BillingWebhookDelivery,
  WebhookDeliveryStatus,
  WebhookDlqStats,
} from '@socialforge/shared';

export class WebhookDlqService {
  private static tableEnsured = false;

  /**
   * Idempotently ensure the billing_webhook_deliveries table exists
   */
  public static async ensureTable(): Promise<void> {
    if (this.tableEnsured) return;
    const hasTable = await db.schema.hasTable('billing_webhook_deliveries');
    if (!hasTable) {
      await db.schema.createTable('billing_webhook_deliveries', (table) => {
        table.uuid('id').primary();
        table.string('provider', 50).notNullable().defaultTo('stripe');
        table.string('provider_event_id', 255).nullable();
        table.string('event_type', 100).notNullable();
        table.uuid('tenant_id').nullable();
        table.text('payload', 'longtext').notNullable();
        table.text('signature').nullable();
        table
          .enum('status', ['pending', 'processing', 'processed', 'failed', 'dead_letter', 'discarded'])
          .notNullable()
          .defaultTo('pending');
        table.integer('attempts').notNullable().defaultTo(0);
        table.integer('max_attempts').notNullable().defaultTo(5);
        table.timestamp('next_retry_at').nullable();
        table.timestamp('last_attempt_at').nullable();
        table.text('last_error').nullable();
        table.integer('processing_time_ms').nullable();
        table.timestamp('created_at').notNullable().defaultTo(db.fn.now());
        table.timestamp('updated_at').notNullable().defaultTo(db.fn.now());

        table.index(['provider', 'provider_event_id'], 'idx_webhook_prov_event');
        table.index(['status'], 'idx_webhook_status');
        table.index(['next_retry_at'], 'idx_webhook_next_retry');
        table.index(['tenant_id'], 'idx_webhook_tenant');
        table.index(['created_at'], 'idx_webhook_created');
      });
    }
    this.tableEnsured = true;
  }

  /**
   * Calculate exponential backoff in seconds based on attempt count
   */
  public static calculateBackoffSeconds(attempt: number): number {
    // Schedule: 1 -> 30s, 2 -> 2m, 3 -> 10m, 4 -> 30m, 5+ -> 2h
    let base = 30;
    if (attempt === 2) base = 120;
    else if (attempt === 3) base = 600;
    else if (attempt === 4) base = 1800;
    else if (attempt >= 5) base = 7200;

    // Add small random jitter (0-5s) to prevent thundering herd
    const jitter = Math.floor(Math.random() * 5);
    return base + jitter;
  }

  /**
   * Ingest and record an incoming webhook delivery attempt
   */
  public static async recordIncoming(
    provider: string,
    rawPayload: string | Buffer | Record<string, any>,
    signature?: string
  ): Promise<string> {
    await this.ensureTable();

    const payloadString =
      typeof rawPayload === 'string'
        ? rawPayload
        : Buffer.isBuffer(rawPayload)
        ? rawPayload.toString('utf8')
        : JSON.stringify(rawPayload);

    let providerEventId: string | null = null;
    let eventType = 'unknown';
    let tenantId: string | null = null;

    try {
      const parsed = JSON.parse(payloadString);
      providerEventId = parsed.id || null;
      eventType = parsed.type || 'unknown';
      const obj = parsed.data?.object;
      if (obj) {
        tenantId =
          obj.metadata?.tenantId ||
          obj.subscription_details?.metadata?.tenantId ||
          obj.client_reference_id ||
          null;
      }
    } catch {
      // Raw string payload
    }

    const id = crypto.randomUUID();
    const now = new Date();

    await db('billing_webhook_deliveries').insert({
      id,
      provider: provider || 'stripe',
      provider_event_id: providerEventId,
      event_type: eventType,
      tenant_id: tenantId,
      payload: payloadString,
      signature: signature || null,
      status: 'pending',
      attempts: 0,
      max_attempts: 5,
      created_at: now,
      updated_at: now,
    });

    return id;
  }

  /**
   * Process a recorded webhook delivery with automated error tracking and exponential backoff
   */
  public static async processDelivery(deliveryId: string): Promise<{
    success: boolean;
    duplicate?: boolean;
    deadLetter?: boolean;
    error?: string;
    attempts: number;
    processingTimeMs?: number;
    nextRetryAt?: Date | null;
  }> {
    await this.ensureTable();

    const delivery = await db('billing_webhook_deliveries').where({ id: deliveryId }).first();
    if (!delivery) {
      throw new Error(`Webhook delivery record ${deliveryId} not found`);
    }

    const currentAttempts = Number(delivery.attempts || 0) + 1;
    const startTime = Date.now();

    // Mark in-flight
    await db('billing_webhook_deliveries').where({ id: deliveryId }).update({
      status: 'processing',
      attempts: currentAttempts,
      last_attempt_at: new Date(),
      updated_at: new Date(),
    });

    try {
      // Dispatches to Stripe Billing Provider with idempotency guard
      const result = await StripeBillingService.handleWebhookEvent(
        delivery.payload,
        delivery.signature || undefined
      );

      const processingTimeMs = Date.now() - startTime;

      // Extract resolved tenantId if available
      let resolvedTenantId = delivery.tenant_id;
      if (!resolvedTenantId) {
        try {
          const parsed = JSON.parse(delivery.payload);
          const obj = parsed.data?.object;
          if (obj) {
            resolvedTenantId =
              obj.metadata?.tenantId ||
              obj.subscription_details?.metadata?.tenantId ||
              obj.client_reference_id ||
              null;
          }
        } catch {
          // Ignored
        }
      }

      await db('billing_webhook_deliveries').where({ id: deliveryId }).update({
        status: 'processed',
        tenant_id: resolvedTenantId,
        last_error: null,
        next_retry_at: null,
        processing_time_ms: processingTimeMs,
        updated_at: new Date(),
      });

      return {
        success: true,
        duplicate: result?.duplicate || false,
        attempts: currentAttempts,
        processingTimeMs,
      };
    } catch (err: any) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = err.message || String(err);

      if (currentAttempts >= Number(delivery.max_attempts || 5)) {
        // Exceeded maximum attempts -> Move to Dead-Letter Queue (DLQ)
        await db('billing_webhook_deliveries').where({ id: deliveryId }).update({
          status: 'dead_letter',
          last_error: errorMessage,
          next_retry_at: null,
          processing_time_ms: processingTimeMs,
          updated_at: new Date(),
        });

        console.error(
          `[WebhookDlqService] Webhook delivery ${deliveryId} (${delivery.event_type}) MOVED TO DEAD_LETTER after ${currentAttempts} attempts. Error: ${errorMessage}`
        );

        return {
          success: false,
          deadLetter: true,
          error: errorMessage,
          attempts: currentAttempts,
          processingTimeMs,
        };
      } else {
        // Schedule next retry with exponential backoff + jitter
        const backoffSeconds = this.calculateBackoffSeconds(currentAttempts);
        const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);

        await db('billing_webhook_deliveries').where({ id: deliveryId }).update({
          status: 'failed',
          last_error: errorMessage,
          next_retry_at: nextRetryAt,
          processing_time_ms: processingTimeMs,
          updated_at: new Date(),
        });

        console.warn(
          `[WebhookDlqService] Webhook delivery ${deliveryId} (${delivery.event_type}) failed attempt ${currentAttempts}/${delivery.max_attempts}. Next retry in ${backoffSeconds}s at ${nextRetryAt.toISOString()}.`
        );

        return {
          success: false,
          deadLetter: false,
          error: errorMessage,
          attempts: currentAttempts,
          nextRetryAt,
          processingTimeMs,
        };
      }
    }
  }

  /**
   * Replay a specific dead-letter or failed delivery
   */
  public static async replayDelivery(
    deliveryId: string,
    force: boolean = false
  ): Promise<{
    success: boolean;
    deliveryId: string;
    status: WebhookDeliveryStatus;
    attempts: number;
    error?: string;
  }> {
    await this.ensureTable();

    const delivery = await db('billing_webhook_deliveries').where({ id: deliveryId }).first();
    if (!delivery) {
      throw new Error(`Webhook delivery ${deliveryId} not found`);
    }

    if (delivery.status === 'processed' && !force) {
      throw new Error('This webhook has already been processed successfully (idempotency guard). Set force=true to override.');
    }

    // Reset status to pending and re-run
    await db('billing_webhook_deliveries').where({ id: deliveryId }).update({
      status: 'pending',
      updated_at: new Date(),
    });

    const res = await this.processDelivery(deliveryId);
    const updated = await db('billing_webhook_deliveries').where({ id: deliveryId }).first();

    return {
      success: res.success,
      deliveryId,
      status: updated?.status || 'failed',
      attempts: updated?.attempts || 0,
      error: res.error,
    };
  }

  /**
   * Batch replay all eligible dead-letter and failed webhook deliveries
   */
  public static async replayAllDeadLetters(): Promise<{
    total: number;
    replayed: number;
    succeeded: number;
    failed: number;
  }> {
    await this.ensureTable();

    const deadLetters = await db('billing_webhook_deliveries')
      .whereIn('status', ['dead_letter', 'failed'])
      .select('id');

    let succeeded = 0;
    let failed = 0;

    for (const dl of deadLetters) {
      try {
        const res = await this.processDelivery(dl.id);
        if (res.success) succeeded++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return {
      total: deadLetters.length,
      replayed: deadLetters.length,
      succeeded,
      failed,
    };
  }

  /**
   * Discard a dead-letter event from the active retry queue
   */
  public static async discardDelivery(deliveryId: string): Promise<boolean> {
    await this.ensureTable();
    const affected = await db('billing_webhook_deliveries')
      .where({ id: deliveryId })
      .update({
        status: 'discarded',
        updated_at: new Date(),
      });
    return affected > 0;
  }

  /**
   * Process all pending retries whose scheduled next_retry_at has arrived
   */
  public static async processScheduledRetries(): Promise<{ retriedCount: number }> {
    await this.ensureTable();

    const now = new Date();
    const eligible = await db('billing_webhook_deliveries')
      .where('status', 'failed')
      .andWhere('next_retry_at', '<=', now)
      .limit(20)
      .select('id');

    for (const row of eligible) {
      try {
        await this.processDelivery(row.id);
      } catch (err) {
        console.error(`[WebhookDlqService] Error in scheduled retry for ${row.id}:`, err);
      }
    }

    return { retriedCount: eligible.length };
  }

  /**
   * Calculate high-level DLQ & Webhook telemetry statistics
   */
  public static async getStats(): Promise<WebhookDlqStats> {
    await this.ensureTable();

    const counts = await db('billing_webhook_deliveries')
      .select('status')
      .count('* as count')
      .groupBy('status');

    let total = 0;
    let processed = 0;
    let pending = 0;
    let failed = 0;
    let deadLetter = 0;

    for (const c of counts) {
      const cnt = Number(c.count || 0);
      total += cnt;
      if (c.status === 'processed') processed += cnt;
      else if (c.status === 'pending' || c.status === 'processing') pending += cnt;
      else if (c.status === 'failed') failed += cnt;
      else if (c.status === 'dead_letter') deadLetter += cnt;
    }

    const retriesRow = await db('billing_webhook_deliveries').sum('attempts as totalAttempts').first();
    const totalRetries = Number(retriesRow?.totalAttempts || 0);
    const successRate = total > 0 ? Number(((processed / total) * 100).toFixed(1)) : 100.0;

    return {
      total,
      processed,
      pending,
      failed,
      deadLetter,
      totalRetries,
      successRate,
    };
  }

  /**
   * Paginated listing of webhook deliveries with search and status filters
   */
  public static async listDeliveries(options: {
    page?: number;
    limit?: number;
    status?: string;
    eventType?: string;
    search?: string;
  }): Promise<{
    items: BillingWebhookDelivery[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    await this.ensureTable();

    const page = Math.max(1, Number(options.page || 1));
    const limit = Math.min(100, Math.max(1, Number(options.limit || 20)));
    const offset = (page - 1) * limit;

    let query = db('billing_webhook_deliveries')
      .leftJoin('tenants', 'billing_webhook_deliveries.tenant_id', 'tenants.id');

    if (options.status) {
      query = query.where('billing_webhook_deliveries.status', options.status);
    }

    if (options.eventType) {
      query = query.where('billing_webhook_deliveries.event_type', options.eventType);
    }

    if (options.search) {
      const term = `%${options.search}%`;
      query = query.where((q) => {
        q.where('billing_webhook_deliveries.provider_event_id', 'like', term)
          .orWhere('billing_webhook_deliveries.event_type', 'like', term)
          .orWhere('billing_webhook_deliveries.last_error', 'like', term)
          .orWhere('tenants.name', 'like', term);
      });
    }

    const totalRow = await query.clone().count('billing_webhook_deliveries.id as total').first();
    const total = Number(totalRow?.total || 0);

    const rows = await query
      .select(
        'billing_webhook_deliveries.*',
        'tenants.name as tenant_name'
      )
      .orderBy('billing_webhook_deliveries.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const items: BillingWebhookDelivery[] = rows.map((r) => {
      let parsedPayload: any = r.payload;
      try {
        if (typeof r.payload === 'string') parsedPayload = JSON.parse(r.payload);
      } catch {
        // Keep string
      }

      return {
        id: r.id,
        provider: r.provider,
        providerEventId: r.provider_event_id,
        eventType: r.event_type,
        tenantId: r.tenant_id,
        tenantName: r.tenant_name,
        payload: parsedPayload,
        signature: r.signature,
        status: r.status,
        attempts: Number(r.attempts || 0),
        maxAttempts: Number(r.max_attempts || 5),
        nextRetryAt: r.next_retry_at ? new Date(r.next_retry_at).toISOString() : null,
        lastAttemptAt: r.last_attempt_at ? new Date(r.last_attempt_at).toISOString() : null,
        lastError: r.last_error,
        processingTimeMs: r.processing_time_ms ? Number(r.processing_time_ms) : null,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
