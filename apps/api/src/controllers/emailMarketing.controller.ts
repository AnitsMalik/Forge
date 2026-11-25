import { Request, Response } from 'express';
import { EmailMarketingService } from '../services/emailMarketing/emailMarketing.service.js';

export class EmailMarketingController {
  // Subscribers
  public static async listSubscribers(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { search, status, limit, offset } = req.query;

      const result = await EmailMarketingService.listSubscribers(tenantId, brandId, {
        search: search as string,
        status: status as string,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });

      return res.json({ ...result });
    } catch (err: any) {
      console.error('EmailMarketingController.listSubscribers error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createSubscriber(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { email, firstName, lastName, tags, source, metadata } = req.body;

      if (!email || !email.trim()) {
        return res.status(400).json({ success: false, error: 'email is required' });
      }

      const subscriber = await EmailMarketingService.createSubscriber(tenantId, brandId, {
        email,
        firstName,
        lastName,
        tags,
        source,
        metadata,
      });

      return res.status(201).json({ success: true, subscriber });
    } catch (err: any) {
      console.error('EmailMarketingController.createSubscriber error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async bulkImportSubscribers(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { subscribers } = req.body;

      if (!Array.isArray(subscribers) || subscribers.length === 0) {
        return res.status(400).json({ success: false, error: 'subscribers array is required' });
      }

      const result = await EmailMarketingService.bulkImportSubscribers(tenantId, brandId, subscribers);
      return res.status(201).json({ success: true, ...result });
    } catch (err: any) {
      console.error('EmailMarketingController.bulkImportSubscribers error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async unsubscribe(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, subscriberId } = req.params;

      const success = await EmailMarketingService.unsubscribe(tenantId, brandId, subscriberId);
      return res.json({ success });
    } catch (err: any) {
      console.error('EmailMarketingController.unsubscribe error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async syncCrmContacts(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const result = await EmailMarketingService.syncFromCrmContacts(tenantId, brandId);
      return res.json({ ...result });
    } catch (err: any) {
      console.error('EmailMarketingController.syncCrmContacts error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Templates
  public static async listTemplates(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const templates = await EmailMarketingService.listTemplates(tenantId, brandId);
      return res.json({ success: true, templates });
    } catch (err: any) {
      console.error('EmailMarketingController.listTemplates error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createTemplate(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { name, category, subject, htmlContent, blocksJson } = req.body;

      if (!name || !htmlContent) {
        return res.status(400).json({ success: false, error: 'name and htmlContent are required' });
      }

      const template = await EmailMarketingService.createTemplate(tenantId, brandId, {
        name,
        category,
        subject,
        htmlContent,
        blocksJson,
      });

      return res.status(201).json({ success: true, template });
    } catch (err: any) {
      console.error('EmailMarketingController.createTemplate error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateTemplate(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, templateId } = req.params;
      const { name, category, subject, htmlContent, blocksJson } = req.body;

      const template = await EmailMarketingService.updateTemplate(tenantId, brandId, templateId, {
        name,
        category,
        subject,
        htmlContent,
        blocksJson,
      });

      return res.json({ success: true, template });
    } catch (err: any) {
      console.error('EmailMarketingController.updateTemplate error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteTemplate(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, templateId } = req.params;

      const success = await EmailMarketingService.deleteTemplate(tenantId, brandId, templateId);
      return res.json({ success });
    } catch (err: any) {
      console.error('EmailMarketingController.deleteTemplate error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Campaigns
  public static async listCampaigns(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const campaigns = await EmailMarketingService.listCampaigns(tenantId, brandId);
      return res.json({ success: true, campaigns });
    } catch (err: any) {
      console.error('EmailMarketingController.listCampaigns error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createCampaign(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { name, subject, previewText, fromName, fromEmail, replyTo, htmlContent, plainText, blocksJson, scheduledAt } = req.body;

      if (!name || !subject || !fromEmail) {
        return res.status(400).json({ success: false, error: 'name, subject, and fromEmail are required' });
      }

      const campaign = await EmailMarketingService.createCampaign(tenantId, brandId, {
        name,
        subject,
        previewText,
        fromName,
        fromEmail,
        replyTo,
        htmlContent,
        plainText,
        blocksJson,
        scheduledAt,
      });

      return res.status(201).json({ success: true, campaign });
    } catch (err: any) {
      console.error('EmailMarketingController.createCampaign error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async sendCampaign(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, campaignId } = req.params;
      const { targetSubscriberIds } = req.body || {};

      const result = await EmailMarketingService.sendCampaign(tenantId, brandId, campaignId, {
        targetSubscriberIds,
      });
      return res.json({ success: true, data: result, ...result });
    } catch (err: any) {
      console.error('EmailMarketingController.sendCampaign error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async sendTestEmail(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { recipientEmail, subject, htmlContent, fromName, fromEmail, campaignId } = req.body;

      if (!recipientEmail || !subject || !htmlContent) {
        return res.status(400).json({ success: false, error: 'recipientEmail, subject, and htmlContent are required' });
      }

      const result = await EmailMarketingService.sendTestEmail(tenantId, brandId, {
        recipientEmail,
        subject,
        htmlContent,
        fromName,
        fromEmail,
        campaignId,
      });

      return res.json({ ...result });
    } catch (err: any) {
      console.error('EmailMarketingController.sendTestEmail error:', err);
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  public static async getCampaignDeliveries(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, campaignId } = req.params;
      const { status, limit, offset } = req.query;

      const result = await EmailMarketingService.getCampaignDeliveries(tenantId, brandId, campaignId, {
        status: status as string,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });

      return res.json({ ...result });
    } catch (err: any) {
      console.error('EmailMarketingController.getCampaignDeliveries error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteCampaign(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, campaignId } = req.params;

      const success = await EmailMarketingService.deleteCampaign(tenantId, brandId, campaignId);
      return res.json({ success });
    } catch (err: any) {
      console.error('EmailMarketingController.deleteCampaign error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getEspConfig(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const result = await EmailMarketingService.getEspConfig(tenantId, brandId);
      return res.json(result);
    } catch (err: any) {
      console.error('EmailMarketingController.getEspConfig error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async saveEspConfig(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const result = await EmailMarketingService.saveEspConfig(tenantId, brandId, req.body);
      return res.json(result);
    } catch (err: any) {
      console.error('EmailMarketingController.saveEspConfig error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async testEspConfig(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { recipientEmail, testConfig } = req.body;

      if (!recipientEmail) {
        return res.status(400).json({ success: false, error: 'recipientEmail is required' });
      }

      const result = await EmailMarketingService.testEspConnection(
        tenantId,
        brandId,
        recipientEmail,
        testConfig
      );
      return res.json(result);
    } catch (err: any) {
      console.error('EmailMarketingController.testEspConfig error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async verifyDomainDns(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { domain } = req.body || {};

      const result = await EmailMarketingService.verifyDomainDns(tenantId, brandId, domain);
      return res.json(result);
    } catch (err: any) {
      console.error('EmailMarketingController.verifyDomainDns error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async disconnectEspConfig(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const result = await EmailMarketingService.disconnectEspConfig(tenantId, brandId);
      return res.json(result);
    } catch (err: any) {
      console.error('EmailMarketingController.disconnectEspConfig error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

