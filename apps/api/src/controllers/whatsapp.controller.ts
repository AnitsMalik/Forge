import { Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsapp/whatsapp.service.js';
import { WhatsAppBillingNotificationService } from '../services/billing/whatsappBillingNotification.service.js';
import { db } from '../db/connection.js';

export class WhatsAppController {
  // Account Status & Connection
  public static async getAccount(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const account = await WhatsAppService.getAccountStatus(tenantId, brandId);
      return res.json({ success: true, account });
    } catch (err: any) {
      console.error('WhatsAppController.getAccount error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async connectAccount(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { wabaId, phoneNumberId, displayPhoneNumber, verifiedName } = req.body;

      if (!wabaId || !phoneNumberId || !displayPhoneNumber) {
        return res.status(400).json({ success: false, error: 'wabaId, phoneNumberId, and displayPhoneNumber are required' });
      }

      const account = await WhatsAppService.connectAccount(tenantId, brandId, {
        wabaId,
        phoneNumberId,
        displayPhoneNumber,
        verifiedName: verifiedName || 'Brand Official',
      });

      return res.json({ success: true, account });
    } catch (err: any) {
      console.error('WhatsAppController.connectAccount error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Templates
  public static async listTemplates(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const templates = await WhatsAppService.listTemplates(tenantId, brandId);
      return res.json({ success: true, templates });
    } catch (err: any) {
      console.error('WhatsAppController.listTemplates error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createTemplate(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { name, category, language, headerType, bodyText, footerText, buttons } = req.body;

      if (!name || !bodyText) {
        return res.status(400).json({ success: false, error: 'Template name and bodyText are required' });
      }

      const template = await WhatsAppService.createTemplate(tenantId, brandId, {
        name,
        category,
        language,
        headerType,
        bodyText,
        footerText,
        buttons,
      });

      return res.status(201).json({ success: true, template });
    } catch (err: any) {
      console.error('WhatsAppController.createTemplate error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Campaigns
  public static async listCampaigns(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const campaigns = await WhatsAppService.listCampaigns(tenantId, brandId);
      return res.json({ success: true, campaigns });
    } catch (err: any) {
      console.error('WhatsAppController.listCampaigns error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createCampaign(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { name, templateId } = req.body;

      if (!name || !templateId) {
        return res.status(400).json({ success: false, error: 'name and templateId are required' });
      }

      const campaign = await WhatsAppService.createCampaign(tenantId, brandId, { name, templateId });
      return res.status(201).json({ success: true, campaign });
    } catch (err: any) {
      console.error('WhatsAppController.createCampaign error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async dispatchCampaign(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, campaignId } = req.params;

      const result = await WhatsAppService.dispatchCampaign(tenantId, brandId, campaignId);
      return res.json({ success: true, result });
    } catch (err: any) {
      console.error('WhatsAppController.dispatchCampaign error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Conversations (2-Way Messaging)
  public static async listConversations(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const conversations = await WhatsAppService.listConversations(tenantId, brandId);
      return res.json({ success: true, conversations });
    } catch (err: any) {
      console.error('WhatsAppController.listConversations error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getThread(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, phoneNumber } = req.params;

      const messages = await WhatsAppService.getThreadMessages(tenantId, brandId, phoneNumber);
      return res.json({ success: true, messages });
    } catch (err: any) {
      console.error('WhatsAppController.getThread error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async sendMessage(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { to, type, templateName, body, parameters, contactId } = req.body;

      if (!to) {
        return res.status(400).json({ success: false, error: 'Recipient phone number (to) is required' });
      }

      const result = await WhatsAppService.sendMessage(tenantId, brandId, {
        to,
        type: type || 'text',
        templateName,
        body,
        parameters,
        contactId,
      });

      return res.json({ success: true, result });
    } catch (err: any) {
      console.error('WhatsAppController.sendMessage error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async receiveInbound(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { phoneNumber, message } = req.body;

      if (!phoneNumber || !message) {
        return res.status(400).json({ success: false, error: 'phoneNumber and message are required' });
      }

      const reply = await WhatsAppService.receiveInboundReply(tenantId, brandId, phoneNumber, message);
      return res.json({ success: true, reply });
    } catch (err: any) {
      console.error('WhatsAppController.receiveInbound error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Provider Configuration Status
  public static async getProviderStatus(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.query as { brandId?: string };
      const status = await WhatsAppBillingNotificationService.checkProviderConfig(tenantId, brandId);
      return res.json({ success: true, status });
    } catch (err: any) {
      console.error('WhatsAppController.getProviderStatus error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Billing Notifications History
  public static async listBillingNotifications(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const rows = await db('whatsapp_messages')
        .where({ tenant_id: tenantId, template_name: 'billing_payment_confirmation' })
        .orderBy('created_at', 'desc')
        .limit(100);

      return res.json({ success: true, items: rows });
    } catch (err: any) {
      console.error('WhatsAppController.listBillingNotifications error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Retry Failed Billing Notification
  public static async retryBillingNotification(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { id } = req.params;
      const maxAttempts = req.body?.maxAttempts ? parseInt(req.body.maxAttempts, 10) : 3;

      const result = await WhatsAppBillingNotificationService.retryFailedNotification(id, {
        tenantId,
        maxAttempts,
      });

      return res.json({ success: result.success, result });
    } catch (err: any) {
      console.error('WhatsAppController.retryBillingNotification error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Meta Webhook Verification & Event Handler
  public static async verifyWebhook(req: Request, res: Response) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || 'socialforge_meta_verify';

    if (mode === 'subscribe' && token === verifyToken) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification failed');
  }

  public static async handleWebhook(req: Request, res: Response) {
    try {
      const payload = req.body;
      await WhatsAppService.handleWebhookPayload(payload);
      await WhatsAppBillingNotificationService.handleStatusCallback(payload);
      // Immediate 200 OK acknowledgment to Meta
      res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
      console.error('WhatsAppController.handleWebhook error:', err);
      res.status(500).send('Internal Error');
    }
  }
}

