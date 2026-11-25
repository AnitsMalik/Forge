import type { Request, Response } from 'express';
import { finOpsService } from '../services/superadmin/finOps.service.js';

export class FinOpsController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await finOpsService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listAccounts(req: Request, res: Response): Promise<void> {
    try {
      const { provider, status } = req.query;
      const accounts = await finOpsService.listAccounts({
        provider: provider as string,
        status: status as string,
      });
      res.json({ success: true, data: accounts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getAccountById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const account = await finOpsService.getAccountById(id);
      if (!account) {
        res.status(404).json({ success: false, error: `Cloud cost account '${id}' not found` });
        return;
      }
      res.json({ success: true, data: account });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createAccount(req: Request, res: Response): Promise<void> {
    try {
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const created = await finOpsService.createAccount(req.body, operatorUserId);
      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateAccount(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const updated = await finOpsService.updateAccount(id, req.body, operatorUserId);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      await finOpsService.deleteAccount(id, operatorUserId);
      res.json({ success: true, message: `Cloud cost account '${id}' deleted successfully` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async listTenantAttributions(req: Request, res: Response): Promise<void> {
    try {
      const { period, tenantId } = req.query;
      const attributions = await finOpsService.listTenantAttributions({
        period: period as string,
        tenantId: tenantId as string,
      });
      res.json({ success: true, data: attributions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listRightsizing(req: Request, res: Response): Promise<void> {
    try {
      const { status, provider } = req.query;
      const rightsizing = await finOpsService.listRightsizing({
        status: status as string,
        provider: provider as string,
      });
      res.json({ success: true, data: rightsizing });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async applyRightsizing(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const applied = await finOpsService.applyRightsizing(id, operatorUserId);
      res.json({ success: true, data: applied });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async dismissRightsizing(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const dismissed = await finOpsService.dismissRightsizing(id, operatorUserId);
      res.json({ success: true, data: dismissed });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  simulateScenario(req: Request, res: Response): void {
    try {
      const result = finOpsService.simulateScenario(req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

export const finOpsController = new FinOpsController();
