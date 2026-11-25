import { Request, Response } from 'express';
import { SmsVoiceService } from '../services/smsVoice/smsVoice.service.js';

export class SmsVoiceController {
  // SMS Sender
  public static async getSender(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const sender = await SmsVoiceService.getSenderStatus(tenantId, brandId);
      return res.json({ success: true, sender });
    } catch (err: any) {
      console.error('SmsVoiceController.getSender error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async configureSender(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { phoneNumber, brandName, provider, senderType } = req.body;

      if (!phoneNumber || !brandName) {
        return res.status(400).json({ success: false, error: 'phoneNumber and brandName are required' });
      }

      const sender = await SmsVoiceService.configureSender(tenantId, brandId, {
        phoneNumber,
        brandName,
        provider,
        senderType,
      });

      return res.json({ success: true, sender });
    } catch (err: any) {
      console.error('SmsVoiceController.configureSender error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async calculateSegments(req: Request, res: Response) {
    try {
      const { body } = req.body;
      const result = SmsVoiceService.calculateSegments(body || '');
      return res.json({ success: true, ...result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // SMS Campaigns
  public static async listCampaigns(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const campaigns = await SmsVoiceService.listCampaigns(tenantId, brandId);
      return res.json({ success: true, campaigns });
    } catch (err: any) {
      console.error('SmsVoiceController.listCampaigns error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createCampaign(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { name, body } = req.body;

      if (!name || !body) {
        return res.status(400).json({ success: false, error: 'name and body are required' });
      }

      const campaign = await SmsVoiceService.createCampaign(tenantId, brandId, { name, body });
      return res.status(201).json({ success: true, campaign });
    } catch (err: any) {
      console.error('SmsVoiceController.createCampaign error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async dispatchCampaign(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, campaignId } = req.params;

      const result = await SmsVoiceService.dispatchCampaign(tenantId, brandId, campaignId);
      return res.json({ success: true, result });
    } catch (err: any) {
      console.error('SmsVoiceController.dispatchCampaign error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Direct SMS Send & Inbound
  public static async sendSms(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { to, body, contactId, campaignId } = req.body;

      if (!to || !body) {
        return res.status(400).json({ success: false, error: 'to and body are required' });
      }

      const result = await SmsVoiceService.sendSms(tenantId, brandId, {
        to,
        body,
        contactId,
        campaignId,
      });

      return res.json({ success: true, result });
    } catch (err: any) {
      console.error('SmsVoiceController.sendSms error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async receiveInbound(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { from, body } = req.body;

      if (!from || !body) {
        return res.status(400).json({ success: false, error: 'from and body are required' });
      }

      const result = await SmsVoiceService.receiveInboundSms(tenantId, brandId, { from, body });
      return res.json({ success: true, result });
    } catch (err: any) {
      console.error('SmsVoiceController.receiveInbound error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async listMessages(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { limit } = req.query;

      const messages = await SmsVoiceService.listMessages(tenantId, brandId, limit ? Number(limit) : 50);
      return res.json({ success: true, messages });
    } catch (err: any) {
      console.error('SmsVoiceController.listMessages error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Voice AI Agent
  public static async getVoiceAgent(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const agent = await SmsVoiceService.getVoiceAgent(tenantId, brandId);
      return res.json({ success: true, agent });
    } catch (err: any) {
      console.error('SmsVoiceController.getVoiceAgent error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateVoiceAgent(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const agent = await SmsVoiceService.updateVoiceAgent(tenantId, brandId, req.body);
      return res.json({ success: true, agent });
    } catch (err: any) {
      console.error('SmsVoiceController.updateVoiceAgent error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async triggerVoiceCall(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { to, contactId, objective, customInstructions } = req.body;

      if (!to) {
        return res.status(400).json({ success: false, error: 'Recipient phone number (to) is required' });
      }

      const call = await SmsVoiceService.triggerVoiceCall(tenantId, brandId, {
        to,
        contactId,
        objective,
        customInstructions,
      });

      return res.json({ success: true, call });
    } catch (err: any) {
      console.error('SmsVoiceController.triggerVoiceCall error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async listVoiceCalls(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { limit } = req.query;

      const calls = await SmsVoiceService.listVoiceCalls(tenantId, brandId, limit ? Number(limit) : 50);
      return res.json({ success: true, calls });
    } catch (err: any) {
      console.error('SmsVoiceController.listVoiceCalls error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

