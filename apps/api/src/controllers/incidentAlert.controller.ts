import type { Request, Response, NextFunction } from 'express';
import { incidentAlertService } from '../services/superadmin/incidentAlert.service.js';

export class IncidentAlertController {
  async getChannels(req: Request, res: Response, next: NextFunction) {
    try {
      const channels = await incidentAlertService.listChannels();
      return res.status(200).json({ success: true, data: channels });
    } catch (err) {
      return next(err);
    }
  }

  async createChannel(req: Request, res: Response, next: NextFunction) {
    try {
      const superadmin = {
        id: req.user!.userId,
        email: req.user!.email,
        ip: req.ip,
      };
      const channel = await incidentAlertService.createChannel(req.body, superadmin);
      return res.status(201).json({ success: true, data: channel });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async testChannel(req: Request, res: Response, next: NextFunction) {
    try {
      const superadmin = {
        id: req.user!.userId,
        email: req.user!.email,
        ip: req.ip,
      };
      const result = await incidentAlertService.testDispatchChannel(req.params.id, superadmin);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async getRules(req: Request, res: Response, next: NextFunction) {
    try {
      const rules = await incidentAlertService.listRules();
      return res.status(200).json({ success: true, data: rules });
    } catch (err) {
      return next(err);
    }
  }

  async createRule(req: Request, res: Response, next: NextFunction) {
    try {
      const superadmin = {
        id: req.user!.userId,
        email: req.user!.email,
        ip: req.ip,
      };
      const rule = await incidentAlertService.createRule(req.body, superadmin);
      return res.status(201).json({ success: true, data: rule });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async toggleRule(req: Request, res: Response, next: NextFunction) {
    try {
      const superadmin = {
        id: req.user!.userId,
        email: req.user!.email,
        ip: req.ip,
      };
      const result = await incidentAlertService.toggleRuleActive(
        req.params.id,
        Boolean(req.body.isActive),
        superadmin
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async getEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, severity, conditionType, page, limit } = req.query;
      const result = await incidentAlertService.listEvents({
        status: status as string,
        severity: severity as string,
        conditionType: conditionType as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  async acknowledgeEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const superadmin = {
        id: req.user!.userId,
        email: req.user!.email,
        ip: req.ip,
      };
      const event = await incidentAlertService.acknowledgeEvent(
        req.params.id,
        superadmin,
        req.body.reason
      );
      return res.status(200).json({ success: true, data: event });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async resolveEvent(req: Request, res: Response, next: NextFunction) {
    try {
      const superadmin = {
        id: req.user!.userId,
        email: req.user!.email,
        ip: req.ip,
      };
      const event = await incidentAlertService.resolveEvent(
        req.params.id,
        superadmin,
        req.body.resolutionNote,
        Boolean(req.body.confirmation)
      );
      return res.status(200).json({ success: true, data: event });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async triggerIncident(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await incidentAlertService.triggerIncident(req.body);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}

export const incidentAlertController = new IncidentAlertController();
