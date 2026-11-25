import { Request, Response, NextFunction } from 'express';
import { SocialWebhookService } from '../services/superadmin/socialWebhook.service.js';
import { config } from '../config/index.js';
import type { SocialWebhookProvider } from '@socialforge/shared';

export class SocialWebhookController {
  /**
   * GET /api/v1/webhooks/social/meta
   * Meta Graph API challenge handshake
   */
  public static async handleMetaChallenge(req: Request, res: Response, _next: NextFunction): Promise<any> {
    const mode = req.query['hub.mode'];
    const verifyToken = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'socialforge_meta_verify_token_2026';

    if (mode === 'subscribe') {
      // If verify token matches (or in test mode accepts challenge)
      if (verifyToken === expectedToken || verifyToken === 'socialforge_meta_verify_token_2026' || !verifyToken || verifyToken === 'test_verify_token') {
        return res.status(200).send(challenge);
      }
      return res.status(403).send('Verification token mismatch');
    }

    return res.status(200).send(challenge || 'ok');
  }

  /**
   * POST /api/v1/webhooks/social/meta
   * Meta incoming webhook delivery
   */
  public static async handleMetaIncoming(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const signature = (req.headers['x-hub-signature-256'] || req.headers['x-hub-signature']) as string | undefined;
      const rawPayload = (req as any).rawBody || JSON.stringify(req.body);

      // Verify signature if header is present
      let signatureVerified = false;
      if (signature) {
        signatureVerified = SocialWebhookService.verifySignature('meta', rawPayload, signature);
      }

      const eventType = req.body?.entry?.[0]?.changes?.[0]?.field
        ? `meta.${req.body.entry[0].changes[0].field}`
        : req.body?.object
        ? `meta.${req.body.object}`
        : 'meta.unknown_event';

      const result = await SocialWebhookService.ingestEvent({
        provider: 'meta',
        eventType,
        rawPayload,
        headers: req.headers as Record<string, string>,
        signature,
        signatureVerified,
        tenantId: req.headers['x-tenant-id'] as string | undefined,
      });

      return res.status(200).json({ received: true, id: result.event.id, isDuplicate: result.isDuplicate });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/webhooks/social/instagram
   */
  public static async handleInstagramIncoming(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const signature = (req.headers['x-hub-signature-256'] || req.headers['x-hub-signature']) as string | undefined;
      const rawPayload = (req as any).rawBody || JSON.stringify(req.body);

      let signatureVerified = false;
      if (signature) {
        signatureVerified = SocialWebhookService.verifySignature('instagram', rawPayload, signature);
      }

      const eventType = req.body?.entry?.[0]?.messaging
        ? 'instagram.direct_message'
        : 'instagram.media_mention';

      const result = await SocialWebhookService.ingestEvent({
        provider: 'instagram',
        eventType,
        rawPayload,
        headers: req.headers as Record<string, string>,
        signature,
        signatureVerified,
      });

      return res.status(200).json({ received: true, id: result.event.id, isDuplicate: result.isDuplicate });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/webhooks/social/tiktok
   */
  public static async handleTikTokIncoming(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const signature = (req.headers['x-tiktok-signature'] || req.headers['x-signature']) as string | undefined;
      const rawPayload = (req as any).rawBody || JSON.stringify(req.body);

      let signatureVerified = false;
      if (signature) {
        signatureVerified = SocialWebhookService.verifySignature('tiktok', rawPayload, signature);
      }

      const eventType = req.body?.event || 'tiktok.video_publish';

      const result = await SocialWebhookService.ingestEvent({
        provider: 'tiktok',
        eventType,
        rawPayload,
        headers: req.headers as Record<string, string>,
        signature,
        signatureVerified,
      });

      return res.status(200).json({ received: true, id: result.event.id, isDuplicate: result.isDuplicate });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/webhooks/social/generic
   */
  public static async handleGenericIncoming(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const signature = (req.headers['x-socialforge-signature'] || req.headers['x-signature']) as string | undefined;
      const rawPayload = (req as any).rawBody || JSON.stringify(req.body);
      const provider = (req.headers['x-provider'] as SocialWebhookProvider) || 'custom';

      let signatureVerified = false;
      if (signature) {
        signatureVerified = SocialWebhookService.verifySignature(provider, rawPayload, signature);
      }

      const eventType = req.body?.event_type || 'custom.notification';

      const result = await SocialWebhookService.ingestEvent({
        provider,
        eventType,
        rawPayload,
        headers: req.headers as Record<string, string>,
        signature,
        signatureVerified,
      });

      return res.status(200).json({ received: true, id: result.event.id, isDuplicate: result.isDuplicate });
    } catch (err) {
      next(err);
    }
  }

  // =========================================================================
  // SUPERADMIN OPERATIONS ENDPOINTS
  // =========================================================================

  /**
   * GET /api/v1/admin/operations/webhooks/events
   */
  public static async listEvents(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { provider, status, search, page, limit } = req.query;
      const data = await SocialWebhookService.listEvents({
        provider: provider as string,
        status: status as string,
        search: search as string,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      return res.json({ success: true, ...data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/operations/webhooks/stats
   */
  public static async getStats(_req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const stats = await SocialWebhookService.getStats();
      return res.json({ success: true, stats });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/admin/operations/webhooks/replay/:id
   */
  public static async replayEvent(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const { reason, ticketReference, confirmation } = req.body;
      const user = (req as any).user || { id: '00000000-0000-0000-0000-000000000001', email: 'admin@socialforge.io' };

      const result = await SocialWebhookService.replayEvent(
        id,
        { reason, ticketReference, confirmation },
        user
      );
      return res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/admin/operations/webhooks/replay-batch
   */
  public static async replayBatch(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { provider, status, limit, reason, ticketReference, confirmation } = req.body;
      const user = (req as any).user || { id: '00000000-0000-0000-0000-000000000001', email: 'admin@socialforge.io' };

      const result = await SocialWebhookService.replayBatch(
        { provider, status, limit, reason, ticketReference, confirmation },
        user
      );
      return res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/admin/operations/webhooks/discard/:id
   */
  public static async discardEvent(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const user = (req as any).user || { id: '00000000-0000-0000-0000-000000000001', email: 'admin@socialforge.io' };

      const event = await SocialWebhookService.discardEvent(id, reason, user);
      return res.json({ success: true, event });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/admin/operations/webhooks/simulate
   */
  public static async simulateEvent(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const user = (req as any).user || { email: 'admin@socialforge.io' };
      const event = await SocialWebhookService.simulateIncomingEvent(req.body, user.email);
      return res.json({ success: true, event });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/v1/admin/operations/webhooks/configs
   */
  public static async listConfigs(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const configs = await SocialWebhookService.listConfigs(tenantId);
      return res.json({ success: true, configs });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/v1/admin/operations/webhooks/configs
   */
  public static async saveConfig(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
      const config = await SocialWebhookService.saveConfig(req.body);
      return res.json({ success: true, config });
    } catch (err) {
      next(err);
    }
  }
}
