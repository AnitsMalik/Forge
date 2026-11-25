import crypto from 'crypto';
import { db } from '../../db/connection.js';
import { config } from '../../config/index.js';
import { SuperadminOpsService } from './superadminOps.service.js';
import type {
  SocialWebhookEvent,
  SocialWebhookConfig,
  SocialWebhookReplayLog,
  SocialWebhookStats,
  SocialWebhookProvider,
  SocialWebhookEventStatus,
  ReplayWebhookRequest,
  ReplayBatchRequest,
  SimulateWebhookRequest,
} from '@socialforge/shared';

export class SocialWebhookService {
  /**
   * Constant-time string / buffer equality comparison to prevent timing side-channel attacks
   */
  private static secureTimingCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }

  /**
   * Verifies incoming webhook signature based on provider specifications
   */
  public static verifySignature(
    provider: SocialWebhookProvider,
    rawBody: string | Buffer,
    signatureHeader?: string,
    customSecret?: string
  ): boolean {
    if (!signatureHeader) return false;

    const payloadBuffer = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
    const cleanHeader = signatureHeader.trim();

    try {
      if (provider === 'meta' || provider === 'instagram') {
        // Meta Graph API / Instagram Webhook format: sha256=<hex_hmac>
        const secret = customSecret || config.meta.appSecret || 'test_meta_webhook_secret_key_123';
        let expectedHash = '';

        if (cleanHeader.startsWith('sha256=')) {
          expectedHash = crypto.createHmac('sha256', secret).update(payloadBuffer).digest('hex');
          const receivedHash = cleanHeader.replace('sha256=', '');
          return this.secureTimingCompare(expectedHash, receivedHash);
        } else if (cleanHeader.startsWith('sha1=')) {
          expectedHash = crypto.createHmac('sha1', secret).update(payloadBuffer).digest('hex');
          const receivedHash = cleanHeader.replace('sha1=', '');
          return this.secureTimingCompare(expectedHash, receivedHash);
        }
        return false;
      }

      if (provider === 'tiktok') {
        // TikTok Webhook format: hex HMAC-SHA256
        const secret = customSecret || 'test_tiktok_webhook_secret_key_123';
        const expectedHash = crypto.createHmac('sha256', secret).update(payloadBuffer).digest('hex');
        const receivedHash = cleanHeader.replace(/^sha256=/, '');
        return this.secureTimingCompare(expectedHash, receivedHash);
      }

      if (provider === 'stripe') {
        // Stripe webhook format: t=timestamp,v1=signature
        const secret = customSecret || config.stripe.webhookSecret || 'whsec_test_secret_key_123';
        const parts = cleanHeader.split(',');
        const tPart = parts.find((p) => p.startsWith('t='));
        const v1Part = parts.find((p) => p.startsWith('v1='));
        if (tPart && v1Part) {
          const timestamp = tPart.substring(2);
          const receivedSig = v1Part.substring(3);
          const signedPayload = `${timestamp}.${payloadBuffer.toString('utf8')}`;
          const expectedSig = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
          return this.secureTimingCompare(expectedSig, receivedSig);
        }
        // Direct HMAC fallback
        const expectedHash = crypto.createHmac('sha256', secret).update(payloadBuffer).digest('hex');
        return this.secureTimingCompare(expectedHash, cleanHeader);
      }

      // Generic / Custom Webhook format: X-SocialForge-Signature: sha256=<hex>
      const secret = customSecret || config.jwtSecret || 'test_socialforge_generic_secret_123';
      const expectedHash = crypto.createHmac('sha256', secret).update(payloadBuffer).digest('hex');
      const receivedHash = cleanHeader.replace(/^sha256=/, '');
      return this.secureTimingCompare(expectedHash, receivedHash);
    } catch {
      return false;
    }
  }

  /**
   * Deterministically computes idempotency key to prevent duplicate delivery processing
   */
  public static computeIdempotencyKey(
    provider: SocialWebhookProvider,
    providerEventId?: string | null,
    rawBody?: string | Buffer
  ): string {
    if (providerEventId && providerEventId.trim().length > 0) {
      return crypto
        .createHash('sha256')
        .update(`${provider}:${providerEventId.trim()}`)
        .digest('hex');
    }

    const payloadStr =
      typeof rawBody === 'string'
        ? rawBody
        : Buffer.isBuffer(rawBody)
        ? rawBody.toString('utf8')
        : JSON.stringify(rawBody || {});

    return crypto
      .createHash('sha256')
      .update(`${provider}:content:${payloadStr}`)
      .digest('hex');
  }

  /**
   * Ingests and processes an incoming social webhook event with deduplication and durable logging
   */
  public static async ingestEvent(params: {
    provider: SocialWebhookProvider;
    eventType: string;
    rawPayload: string | Buffer | Record<string, any>;
    headers?: Record<string, string>;
    signature?: string;
    signatureVerified?: boolean;
    tenantId?: string;
    brandId?: string;
    connectionId?: string;
    providerEventId?: string;
  }): Promise<{ event: SocialWebhookEvent; isDuplicate: boolean }> {
    const payloadStr =
      typeof params.rawPayload === 'string'
        ? params.rawPayload
        : Buffer.isBuffer(params.rawPayload)
        ? params.rawPayload.toString('utf8')
        : JSON.stringify(params.rawPayload);

    let parsedPayload: Record<string, any> = {};
    try {
      parsedPayload = JSON.parse(payloadStr);
    } catch {
      parsedPayload = { raw: payloadStr };
    }

    // Extract provider event ID if not explicitly passed
    const providerEventId =
      params.providerEventId ||
      parsedPayload.id ||
      parsedPayload.entry?.[0]?.id ||
      parsedPayload.entry?.[0]?.messaging?.[0]?.message?.mid ||
      null;

    const idempotencyKey = this.computeIdempotencyKey(params.provider, providerEventId, payloadStr);

    // 1. Check for existing event with this idempotency key
    const existing = await db('social_webhook_events').where({ idempotency_key: idempotencyKey }).first();
    if (existing) {
      return {
        event: this.mapEventRecord(existing),
        isDuplicate: true,
      };
    }

    // 2. Insert new event in 'received' state
    const eventId = crypto.randomUUID();
    const startTime = Date.now();

    await db('social_webhook_events').insert({
      id: eventId,
      provider: params.provider,
      provider_event_id: providerEventId,
      event_type: params.eventType,
      tenant_id: params.tenantId || null,
      brand_id: params.brandId || null,
      connection_id: params.connectionId || null,
      payload: payloadStr,
      headers: params.headers ? JSON.stringify(params.headers) : null,
      signature: params.signature || null,
      signature_verified: params.signatureVerified ?? false,
      status: 'processing',
      attempts: 1,
      max_attempts: 5,
      last_attempt_at: new Date(),
      idempotency_key: idempotencyKey,
      replayed_by_superadmin: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // 3. Execute business dispatch handler
    let finalStatus: SocialWebhookEventStatus = 'processed';
    let errorMessage: string | null = null;

    try {
      await this.dispatchWebhookBusinessLogic({
        id: eventId,
        provider: params.provider,
        eventType: params.eventType,
        payload: parsedPayload,
        tenantId: params.tenantId,
        brandId: params.brandId,
      });
    } catch (err: any) {
      finalStatus = 'failed';
      errorMessage = err?.message || 'Webhook processing failed';
    }

    const processingMs = Date.now() - startTime;

    // 4. Update status and duration
    await db('social_webhook_events')
      .where({ id: eventId })
      .update({
        status: finalStatus,
        last_error: errorMessage,
        processing_time_ms: processingMs,
        updated_at: new Date(),
      });

    const updated = await db('social_webhook_events').where({ id: eventId }).first();
    return {
      event: this.mapEventRecord(updated),
      isDuplicate: false,
    };
  }

  /**
   * Internal dispatcher for executing webhook business handlers
   */
  private static async dispatchWebhookBusinessLogic(event: {
    id: string;
    provider: SocialWebhookProvider;
    eventType: string;
    payload: Record<string, any>;
    tenantId?: string;
    brandId?: string;
  }): Promise<void> {
    // Intentional simulation failure flag
    if (event.payload.__simulate_failure === true) {
      throw new Error(`Simulated webhook delivery exception for test verification [Event: ${event.eventType}]`);
    }

    // Live Production Meta Publication Lock: Live post variants & publishing jobs must never be altered
    // bc2051b1-a44a-4a97-8acd-1f3125c70164 / 1405588742634526_122100337179498315
    if (
      event.payload.post_id === '1405588742634526_122100337179498315' ||
      event.payload.variant_id === 'bc2051b1-a44a-4a97-8acd-1f3125c70164'
    ) {
      // Safely acknowledge without mutating the locked production records
      return;
    }

    // 1. Connection Event Logging if tenant or brand is identifiable
    if (event.tenantId && event.brandId) {
      const hasConnectionEvents = await db.schema.hasTable('connection_events');
      if (hasConnectionEvents) {
        // Look up primary connection for this brand and provider
        const conn = await db('social_connections')
          .where({ brand_id: event.brandId, platform: event.provider === 'instagram' ? 'instagram' : 'facebook' })
          .first();

        if (conn) {
          await db('connection_events').insert({
            id: crypto.randomUUID(),
            connection_id: conn.id,
            tenant_id: event.tenantId,
            brand_id: event.brandId,
            event_type: 'webhook_received',
            status: 'success',
            details: JSON.stringify({
              webhookEventId: event.id,
              eventType: event.eventType,
              provider: event.provider,
            }),
            created_at: new Date(),
          });
        }
      }
    }
  }

  /**
   * Replays a dead-letter or failed webhook event with strict auditing & safeguards
   */
  public static async replayEvent(
    eventId: string,
    req: ReplayWebhookRequest,
    adminUser: { id: string; email: string }
  ): Promise<{ event: SocialWebhookEvent; replayLog: SocialWebhookReplayLog }> {
    if (!req.confirmation) {
      throw new Error('Explicit confirmation is required to replay a dead-letter webhook event.');
    }
    if (!req.reason || req.reason.trim().length < 8) {
      throw new Error('A mandatory support justification reason (minimum 8 characters) is required.');
    }

    const eventRecord = await db('social_webhook_events').where({ id: eventId }).first();
    if (!eventRecord) {
      throw new Error(`Webhook event not found with ID: ${eventId}`);
    }

    const startTime = Date.now();
    let parsedPayload: Record<string, any> = {};
    try {
      parsedPayload = JSON.parse(eventRecord.payload);
    } catch {
      parsedPayload = { raw: eventRecord.payload };
    }

    // Remove simulated failure flag on manual replay if present
    delete parsedPayload.__simulate_failure;

    let replayStatus: 'success' | 'failure' = 'success';
    let errorMessage: string | null = null;
    let nextStatus: SocialWebhookEventStatus = 'processed';

    try {
      await this.dispatchWebhookBusinessLogic({
        id: eventRecord.id,
        provider: eventRecord.provider as SocialWebhookProvider,
        eventType: eventRecord.event_type,
        payload: parsedPayload,
        tenantId: eventRecord.tenant_id,
        brandId: eventRecord.brand_id,
      });
    } catch (err: any) {
      replayStatus = 'failure';
      errorMessage = err?.message || 'Replay execution failed';
      nextStatus = 'dead_letter';
    }

    const executionMs = Date.now() - startTime;
    const replayLogId = crypto.randomUUID();

    // 1. Update the event record
    await db('social_webhook_events')
      .where({ id: eventId })
      .update({
        status: nextStatus,
        attempts: Number(eventRecord.attempts) + 1,
        last_attempt_at: new Date(),
        last_error: errorMessage,
        processing_time_ms: executionMs,
        replayed_by_superadmin: true,
        replayed_at: new Date(),
        updated_at: new Date(),
      });

    // 2. Insert replay log
    await db('social_webhook_replay_logs').insert({
      id: replayLogId,
      event_id: eventId,
      admin_user_id: adminUser.id,
      admin_email: adminUser.email,
      support_ticket: req.ticketReference || null,
      reason: req.reason.trim(),
      replay_status: replayStatus,
      response_payload: JSON.stringify({ executionMs, replayedAt: new Date().toISOString() }),
      execution_ms: executionMs,
      created_at: new Date(),
    });

    // 3. Log in superadmin_audit_logs
    await SuperadminOpsService.logAudit({
      superadminId: adminUser.id,
      superadminEmail: adminUser.email,
      action: 'webhook_event_replayed',
      targetTenantId: eventRecord.tenant_id || undefined,
      reason: req.reason.trim(),
      details: {
        eventId,
        provider: eventRecord.provider,
        eventType: eventRecord.event_type,
        replayStatus,
        ticketReference: req.ticketReference || null,
      },
    });

    const updatedEvent = await db('social_webhook_events').where({ id: eventId }).first();
    const replayLogRecord = await db('social_webhook_replay_logs').where({ id: replayLogId }).first();

    return {
      event: this.mapEventRecord(updatedEvent),
      replayLog: {
        id: replayLogRecord.id,
        eventId: replayLogRecord.event_id,
        adminUserId: replayLogRecord.admin_user_id,
        adminEmail: replayLogRecord.admin_email,
        supportTicket: replayLogRecord.support_ticket,
        reason: replayLogRecord.reason,
        replayStatus: replayLogRecord.replay_status,
        responsePayload:
          typeof replayLogRecord.response_payload === 'string'
            ? JSON.parse(replayLogRecord.response_payload)
            : replayLogRecord.response_payload || null,
        executionMs: replayLogRecord.execution_ms,
        createdAt: new Date(replayLogRecord.created_at).toISOString(),
      },
    };
  }

  /**
   * Replays eligible failed or dead-letter webhook events in bulk
   */
  public static async replayBatch(
    req: ReplayBatchRequest,
    adminUser: { id: string; email: string }
  ): Promise<{ replayedCount: number; successfulCount: number; failedCount: number }> {
    if (!req.confirmation) {
      throw new Error('Explicit confirmation is required to execute batch dead-letter replay.');
    }
    if (!req.reason || req.reason.trim().length < 8) {
      throw new Error('A mandatory support justification reason (minimum 8 characters) is required.');
    }

    const limit = Math.min(Math.max(req.limit || 25, 1), 100);
    let query = db('social_webhook_events')
      .whereIn('status', req.status === 'failed' ? ['failed'] : req.status === 'dead_letter' ? ['dead_letter'] : ['failed', 'dead_letter']);

    if (req.provider && req.provider !== 'all') {
      query = query.andWhere('provider', req.provider);
    }

    const candidates = await query.orderBy('created_at', 'desc').limit(limit);

    let successfulCount = 0;
    let failedCount = 0;

    for (const item of candidates) {
      try {
        const result = await this.replayEvent(
          item.id,
          {
            reason: req.reason,
            ticketReference: req.ticketReference,
            confirmation: true,
          },
          adminUser
        );
        if (result.replayLog.replayStatus === 'success') {
          successfulCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    await SuperadminOpsService.logAudit({
      superadminId: adminUser.id,
      superadminEmail: adminUser.email,
      action: 'webhook_batch_replay_executed',
      reason: req.reason.trim(),
      details: {
        totalCandidates: candidates.length,
        successfulCount,
        failedCount,
        provider: req.provider || 'all',
      },
    });

    return {
      replayedCount: candidates.length,
      successfulCount,
      failedCount,
    };
  }

  /**
   * Discards an unrecoverable dead-letter webhook event
   */
  public static async discardEvent(
    eventId: string,
    reason: string,
    adminUser: { id: string; email: string }
  ): Promise<SocialWebhookEvent> {
    if (!reason || reason.trim().length < 8) {
      throw new Error('A justification reason of at least 8 characters is required to discard a DLQ event.');
    }

    const eventRecord = await db('social_webhook_events').where({ id: eventId }).first();
    if (!eventRecord) {
      throw new Error(`Webhook event not found with ID: ${eventId}`);
    }

    await db('social_webhook_events')
      .where({ id: eventId })
      .update({
        status: 'discarded',
        last_error: `Discarded by admin: ${reason.trim()}`,
        updated_at: new Date(),
      });

    await SuperadminOpsService.logAudit({
      superadminId: adminUser.id,
      superadminEmail: adminUser.email,
      action: 'webhook_event_discarded',
      targetTenantId: eventRecord.tenant_id || undefined,
      reason: reason.trim(),
      details: { eventId, provider: eventRecord.provider },
    });

    const updated = await db('social_webhook_events').where({ id: eventId }).first();
    return this.mapEventRecord(updated);
  }

  /**
   * Simulates an incoming webhook event for end-to-end verification and testing
   */
  public static async simulateIncomingEvent(
    req: SimulateWebhookRequest,
    adminEmail: string
  ): Promise<SocialWebhookEvent> {
    const payload = {
      ...req.payload,
      __simulated_by: adminEmail,
      __simulate_failure: req.simulateFailure ?? false,
    };

    const simulatedHeader = `sha256=${crypto
      .createHmac('sha256', config.meta.appSecret || 'test_meta_webhook_secret_key_123')
      .update(JSON.stringify(payload))
      .digest('hex')}`;

    const { event } = await this.ingestEvent({
      provider: req.provider,
      eventType: req.eventType,
      rawPayload: payload,
      headers: {
        'x-hub-signature-256': simulatedHeader,
        'user-agent': 'SocialForge-Webhook-Simulator/1.0',
      },
      signature: simulatedHeader,
      signatureVerified: true,
      tenantId: req.tenantId,
      brandId: req.brandId,
    });

    return event;
  }

  /**
   * Lists webhook events with filter and search capabilities
   */
  public static async listEvents(filters: {
    provider?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ events: SocialWebhookEvent[]; total: number }> {
    const page = Math.max(filters.page || 1, 1);
    const limit = Math.min(Math.max(filters.limit || 20, 1), 100);
    const offset = (page - 1) * limit;

    let query = db('social_webhook_events')
      .leftJoin('tenants', 'social_webhook_events.tenant_id', 'tenants.id')
      .leftJoin('brands', 'social_webhook_events.brand_id', 'brands.id')
      .select(
        'social_webhook_events.*',
        'tenants.name as tenant_name',
        'brands.name as brand_name'
      );

    if (filters.provider && filters.provider !== 'all') {
      query = query.andWhere('social_webhook_events.provider', filters.provider);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.andWhere('social_webhook_events.status', filters.status);
    }

    if (filters.search && filters.search.trim().length > 0) {
      const term = `%${filters.search.trim()}%`;
      query = query.andWhere((builder) => {
        builder
          .where('social_webhook_events.event_type', 'like', term)
          .orWhere('social_webhook_events.provider_event_id', 'like', term)
          .orWhere('social_webhook_events.payload', 'like', term)
          .orWhere('social_webhook_events.last_error', 'like', term);
      });
    }

    const countRes = await query.clone().clearSelect().count('social_webhook_events.id as total').first();
    const total = Number((countRes as any)?.total || 0);

    const rows = await query.orderBy('social_webhook_events.created_at', 'desc').limit(limit).offset(offset);

    return {
      events: rows.map((r: any) => this.mapEventRecord(r)),
      total,
    };
  }

  /**
   * Computes aggregated webhook telemetry for the past 24 hours
   */
  public static async getStats(): Promise<SocialWebhookStats> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const rows = await db('social_webhook_events')
      .where('created_at', '>=', since24h)
      .select('provider', 'status', 'processing_time_ms', 'replayed_by_superadmin');

    let processedCount = 0;
    let failedCount = 0;
    let deadLetterCount = 0;
    let replayedCount = 0;
    let totalProcessingTime = 0;
    let timedEventsCount = 0;
    const providerBreakdown: Record<string, number> = {};

    for (const r of rows) {
      providerBreakdown[r.provider] = (providerBreakdown[r.provider] || 0) + 1;

      if (r.status === 'processed') processedCount++;
      else if (r.status === 'failed') failedCount++;
      else if (r.status === 'dead_letter') deadLetterCount++;

      if (r.replayed_by_superadmin) replayedCount++;

      if (r.processing_time_ms !== null && r.processing_time_ms !== undefined) {
        totalProcessingTime += Number(r.processing_time_ms);
        timedEventsCount++;
      }
    }

    return {
      totalEvents24h: rows.length,
      processedCount,
      failedCount,
      deadLetterCount,
      replayedCount,
      avgProcessingTimeMs: timedEventsCount > 0 ? Math.round(totalProcessingTime / timedEventsCount) : 0,
      providerBreakdown,
    };
  }

  /**
   * Webhook Configurations: List configs
   */
  public static async listConfigs(tenantId?: string): Promise<SocialWebhookConfig[]> {
    let query = db('social_webhook_configs').select('*');
    if (tenantId) {
      query = query.where({ tenant_id: tenantId });
    }

    const rows = await query.orderBy('created_at', 'desc');
    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      brandId: r.brand_id,
      provider: r.provider as SocialWebhookProvider,
      endpointUrl: r.endpoint_url,
      secretToken: r.secret_token ? '[CONFIGURED_SECRET:****]' : null,
      verifyToken: r.verify_token || null,
      isActive: Boolean(r.is_active),
      autoRetryEnabled: Boolean(r.auto_retry_enabled),
      maxRetries: Number(r.max_retries),
      subscribedEvents: r.subscribed_events
        ? typeof r.subscribed_events === 'string'
          ? JSON.parse(r.subscribed_events)
          : r.subscribed_events
        : [],
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  }

  /**
   * Webhook Configurations: Register or update config
   */
  public static async saveConfig(configData: {
    tenantId?: string;
    brandId?: string;
    provider: SocialWebhookProvider;
    endpointUrl: string;
    secretToken?: string;
    verifyToken?: string;
    isActive?: boolean;
    autoRetryEnabled?: boolean;
    maxRetries?: number;
    subscribedEvents?: string[];
  }): Promise<SocialWebhookConfig> {
    const id = crypto.randomUUID();
    await db('social_webhook_configs').insert({
      id,
      tenant_id: configData.tenantId || null,
      brand_id: configData.brandId || null,
      provider: configData.provider,
      endpoint_url: configData.endpointUrl,
      secret_token: configData.secretToken || null,
      verify_token: configData.verifyToken || null,
      is_active: configData.isActive ?? true,
      auto_retry_enabled: configData.autoRetryEnabled ?? true,
      max_retries: configData.maxRetries || 5,
      subscribed_events: configData.subscribedEvents ? JSON.stringify(configData.subscribedEvents) : null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const row = await db('social_webhook_configs').where({ id }).first();
    return {
      id: row.id,
      tenantId: row.tenant_id,
      brandId: row.brand_id,
      provider: row.provider as SocialWebhookProvider,
      endpointUrl: row.endpoint_url,
      secretToken: row.secret_token ? '[CONFIGURED_SECRET:****]' : null,
      verifyToken: row.verify_token || null,
      isActive: Boolean(row.is_active),
      autoRetryEnabled: Boolean(row.auto_retry_enabled),
      maxRetries: Number(row.max_retries),
      subscribedEvents: row.subscribed_events
        ? typeof row.subscribed_events === 'string'
          ? JSON.parse(row.subscribed_events)
          : row.subscribed_events
        : [],
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }

  /**
   * Helper mapping database row to typed SocialWebhookEvent
   */
  private static mapEventRecord(row: any): SocialWebhookEvent {
    let parsedPayload: Record<string, any> = {};
    try {
      parsedPayload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
    } catch {
      parsedPayload = { raw: row.payload };
    }

    let parsedHeaders: Record<string, string> | null = null;
    if (row.headers) {
      try {
        parsedHeaders = typeof row.headers === 'string' ? JSON.parse(row.headers) : row.headers;
      } catch {
        parsedHeaders = null;
      }
    }

    return {
      id: row.id,
      provider: row.provider as SocialWebhookProvider,
      providerEventId: row.provider_event_id,
      eventType: row.event_type,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name || null,
      brandId: row.brand_id,
      brandName: row.brand_name || null,
      connectionId: row.connection_id,
      payload: parsedPayload,
      headers: parsedHeaders,
      signature: row.signature,
      signatureVerified: Boolean(row.signature_verified),
      status: row.status as SocialWebhookEventStatus,
      attempts: Number(row.attempts),
      maxAttempts: Number(row.max_attempts),
      nextRetryAt: row.next_retry_at ? new Date(row.next_retry_at).toISOString() : null,
      lastAttemptAt: row.last_attempt_at ? new Date(row.last_attempt_at).toISOString() : null,
      lastError: row.last_error,
      processingTimeMs: row.processing_time_ms !== null ? Number(row.processing_time_ms) : null,
      idempotencyKey: row.idempotency_key,
      replayedBySuperadmin: Boolean(row.replayed_by_superadmin),
      replayedAt: row.replayed_at ? new Date(row.replayed_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
    };
  }
}
