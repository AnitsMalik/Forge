import { Request, Response } from 'express';
import { OutboundWebhookService } from '../services/superadmin/outboundWebhook.service.js';

export class OutboundWebhookController {
  /**
   * GET /admin/operations/outbound-webhooks/overview
   */
  static async getOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await OutboundWebhookService.getOverview();
      res.json(overview);
    } catch (err: any) {
      console.error('[OutboundWebhookController] getOverview error:', err);
      res.status(500).json({ error: err.message || 'Failed to retrieve outbound webhook overview' });
    }
  }

  /**
   * GET /admin/operations/outbound-webhooks/endpoints
   */
  static async listEndpoints(req: Request, res: Response): Promise<void> {
    try {
      const { tenantId } = req.query;
      const endpoints = await OutboundWebhookService.listEndpoints(tenantId as string);
      res.json(endpoints);
    } catch (err: any) {
      console.error('[OutboundWebhookController] listEndpoints error:', err);
      res.status(500).json({ error: err.message || 'Failed to list webhook endpoints' });
    }
  }

  /**
   * POST /admin/operations/outbound-webhooks/endpoints
   */
  static async createEndpoint(req: Request, res: Response): Promise<void> {
    try {
      const { name, url, events, tenantId, metadata } = req.body;

      if (!name || !url || !events) {
        res.status(400).json({ error: 'Name, URL, and subscribed events are required.' });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const result = await OutboundWebhookService.createEndpoint(
        {
          name,
          url,
          events,
          tenantId,
          metadata,
        },
        adminUser
      );

      res.status(201).json(result);
    } catch (err: any) {
      console.error('[OutboundWebhookController] createEndpoint error:', err);
      const statusCode = err.message?.includes('SSRF') || err.message?.includes('Invalid webhook URL') ? 400 : 500;
      res.status(statusCode).json({ error: err.message || 'Failed to create webhook endpoint' });
    }
  }

  /**
   * POST /admin/operations/outbound-webhooks/endpoints/:id/rotate-secret
   */
  static async rotateSecret(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const result = await OutboundWebhookService.rotateSecret(id, adminUser);
      res.json(result);
    } catch (err: any) {
      console.error('[OutboundWebhookController] rotateSecret error:', err);
      res.status(err.message?.includes('not found') ? 404 : 500).json({
        error: err.message || 'Failed to rotate webhook secret',
      });
    }
  }

  /**
   * PATCH /admin/operations/outbound-webhooks/endpoints/:id/status
   */
  static async setStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['active', 'paused', 'failed_disabled'].includes(status)) {
        res.status(400).json({ error: "Valid status ('active', 'paused', 'failed_disabled') is required." });
        return;
      }

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const endpoint = await OutboundWebhookService.setEndpointStatus(id, status, adminUser);
      res.json(endpoint);
    } catch (err: any) {
      console.error('[OutboundWebhookController] setStatus error:', err);
      res.status(err.message?.includes('not found') ? 404 : 500).json({
        error: err.message || 'Failed to update endpoint status',
      });
    }
  }

  /**
   * DELETE /admin/operations/outbound-webhooks/endpoints/:id
   */
  static async deleteEndpoint(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      await OutboundWebhookService.deleteEndpoint(id, adminUser);
      res.json({ success: true, message: `Endpoint ${id} deleted.` });
    } catch (err: any) {
      console.error('[OutboundWebhookController] deleteEndpoint error:', err);
      res.status(err.message?.includes('not found') ? 404 : 500).json({
        error: err.message || 'Failed to delete endpoint',
      });
    }
  }

  /**
   * POST /admin/operations/outbound-webhooks/endpoints/:id/test
   */
  static async testDispatch(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { eventType, payload } = req.body;

      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const result = await OutboundWebhookService.dispatchTestWebhook(
        id,
        eventType || 'custom.event',
        payload,
        adminUser
      );

      res.json(result);
    } catch (err: any) {
      console.error('[OutboundWebhookController] testDispatch error:', err);
      res.status(err.message?.includes('not found') ? 404 : 500).json({
        error: err.message || 'Failed to dispatch test webhook',
      });
    }
  }

  /**
   * GET /admin/operations/outbound-webhooks/deliveries
   */
  static async listDeliveries(req: Request, res: Response): Promise<void> {
    try {
      const { endpointId, status, eventType, limit } = req.query;
      const deliveries = await OutboundWebhookService.listDeliveries({
        endpointId: endpointId as string,
        status: status as any,
        eventType: eventType as string,
        limit: limit ? Number(limit) : undefined,
      });
      res.json(deliveries);
    } catch (err: any) {
      console.error('[OutboundWebhookController] listDeliveries error:', err);
      res.status(500).json({ error: err.message || 'Failed to list webhook deliveries' });
    }
  }

  /**
   * POST /admin/operations/outbound-webhooks/deliveries/:id/retry
   */
  static async retryDelivery(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = {
        id: (req as any).user?.userId || (req as any).user?.id || 'superadmin-system',
        email: (req as any).user?.email || 'admin@socialforge.ai',
      };

      const delivery = await OutboundWebhookService.retryDelivery(id, adminUser);
      res.json(delivery);
    } catch (err: any) {
      console.error('[OutboundWebhookController] retryDelivery error:', err);
      res.status(err.message?.includes('not found') ? 404 : 500).json({
        error: err.message || 'Failed to retry delivery',
      });
    }
  }
}
