import type { Request, Response } from 'express';
import { continuousComplianceService } from '../services/superadmin/continuousCompliance.service.js';

export class ContinuousComplianceController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await continuousComplianceService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listControls(req: Request, res: Response): Promise<void> {
    try {
      const { framework, status } = req.query;
      const controls = await continuousComplianceService.listControls({
        framework: framework as string,
        status: status as string,
      });
      res.json({ success: true, data: controls });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getControlById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const control = await continuousComplianceService.getControlById(id);
      if (!control) {
        res.status(404).json({ success: false, error: `Compliance control '${id}' not found` });
        return;
      }
      res.json({ success: true, data: control });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async evaluateControl(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await continuousComplianceService.evaluateControl(id, operatorUserId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async listEvidence(req: Request, res: Response): Promise<void> {
    try {
      const { controlId, collectorType } = req.query;
      const evidence = await continuousComplianceService.listEvidence({
        controlId: controlId as string,
        collectorType: collectorType as string,
      });
      res.json({ success: true, data: evidence });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createAuditorSession(req: Request, res: Response): Promise<void> {
    try {
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const session = await continuousComplianceService.createAuditorSession(req.body, operatorUserId);
      res.status(201).json({ success: true, data: session });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async revokeAuditorSession(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const session = await continuousComplianceService.revokeAuditorSession(id, operatorUserId);
      res.json({ success: true, data: session });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async listAuditorSessions(req: Request, res: Response): Promise<void> {
    try {
      const sessions = await continuousComplianceService.listAuditorSessions();
      res.json({ success: true, data: sessions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  simulateAudit(req: Request, res: Response): void {
    try {
      const result = continuousComplianceService.simulateAudit(req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async exportEvidencePackage(req: Request, res: Response): Promise<void> {
    try {
      const { framework } = req.query;
      const pkg = await continuousComplianceService.exportEvidencePackage((framework as any) || 'soc2_type2');
      res.json({ success: true, data: pkg });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

export const continuousComplianceController = new ContinuousComplianceController();
