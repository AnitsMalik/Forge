import { Request, Response } from 'express';
import { CrmService } from '../services/crm/crm.service.js';
import { hubspotConnector } from '../connectors/hubspot/HubSpotConnector.js';

export class CrmController {
  public static async listContacts(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { search, status, leadSource, limit, offset } = req.query;

      const result = await CrmService.listContacts(tenantId, brandId, {
        search: search as string,
        status: status as string,
        leadSource: leadSource as string,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      });

      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('CrmController.listContacts error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getContact(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, contactId } = req.params;

      const contact = await CrmService.getContact(tenantId, brandId, contactId);
      if (!contact) {
        return res.status(404).json({ success: false, error: 'Contact not found' });
      }

      return res.json({ success: true, contact });
    } catch (err: any) {
      console.error('CrmController.getContact error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createContact(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const actorEmail = (req as any).user?.email;
      const { brandId } = req.params;
      const { firstName, lastName, email, phone, company, jobTitle, status, leadSource, tags, customFields } = req.body;

      if (!firstName || !firstName.trim()) {
        return res.status(400).json({ success: false, error: 'firstName is required' });
      }

      const contact = await CrmService.createContact(
        tenantId,
        brandId,
        { firstName, lastName, email, phone, company, jobTitle, status, leadSource, tags, customFields },
        actorEmail
      );

      return res.status(201).json({ success: true, contact });
    } catch (err: any) {
      console.error('CrmController.createContact error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateContact(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, contactId } = req.params;

      const updated = await CrmService.updateContact(tenantId, brandId, contactId, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Contact not found' });
      }

      return res.json({ success: true, contact: updated });
    } catch (err: any) {
      console.error('CrmController.updateContact error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteContact(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, contactId } = req.params;

      const deleted = await CrmService.deleteContact(tenantId, brandId, contactId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Contact not found' });
      }

      return res.json({ success: true, message: 'Contact deleted successfully' });
    } catch (err: any) {
      console.error('CrmController.deleteContact error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async syncMarketingObjects(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;

      const result = await CrmService.syncMarketingObjectsToLeads(tenantId, brandId);
      return res.json({ success: true, ...result });
    } catch (err: any) {
      console.error('CrmController.syncMarketingObjects error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async syncHubSpotContacts(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const actorEmail = (req as any).user?.email;
      const { brandId } = req.params;

      const result = await hubspotConnector.syncInboundLeadsToCrm({
        tenantId,
        brandId,
        actorEmail,
      });

      return res.json(result);
    } catch (err: any) {
      console.error('CrmController.syncHubSpotContacts error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getPipeline(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId } = req.params;
      const { pipelineId } = req.query;

      const board = await CrmService.getPipelineBoard(tenantId, brandId, pipelineId as string);
      return res.json({ success: true, ...board });
    } catch (err: any) {
      console.error('CrmController.getPipeline error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createDeal(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const actorEmail = (req as any).user?.email;
      const { brandId } = req.params;
      const { title, stageId, value, currency, contactId, pipelineId, expectedCloseDate, status, notes } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ success: false, error: 'Deal title is required' });
      }
      if (!stageId) {
        return res.status(400).json({ success: false, error: 'stageId is required' });
      }

      const deal = await CrmService.createDeal(
        tenantId,
        brandId,
        { title, stageId, value, currency, contactId, pipelineId, expectedCloseDate, status, notes },
        actorEmail
      );

      return res.status(201).json({ success: true, deal });
    } catch (err: any) {
      console.error('CrmController.createDeal error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async moveDealStage(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const actorEmail = (req as any).user?.email;
      const { brandId, dealId } = req.params;
      const { stageId } = req.body;

      if (!stageId) {
        return res.status(400).json({ success: false, error: 'stageId is required' });
      }

      const result = await CrmService.moveDealStage(tenantId, brandId, dealId, stageId, actorEmail);
      if (!result) {
        return res.status(404).json({ success: false, error: 'Deal not found' });
      }

      return res.json({ success: true, deal: result });
    } catch (err: any) {
      console.error('CrmController.moveDealStage error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteDeal(req: Request, res: Response) {
    try {
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;
      const { brandId, dealId } = req.params;

      const deleted = await CrmService.deleteDeal(tenantId, brandId, dealId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Deal not found' });
      }

      return res.json({ success: true, message: 'Deal deleted successfully' });
    } catch (err: any) {
      console.error('CrmController.deleteDeal error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

