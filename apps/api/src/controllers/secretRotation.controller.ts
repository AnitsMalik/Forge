import type { Request, Response } from 'express';
import { secretRotationService } from '../services/secretRotation.service.js';

export class SecretRotationController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await secretRotationService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listKeys(req: Request, res: Response): Promise<void> {
    try {
      const { status, vault_provider, key_type } = req.query;
      const keys = await secretRotationService.listKeys({
        status: status as string,
        vault_provider: vault_provider as string,
        key_type: key_type as string,
      });
      res.json({ success: true, data: keys });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getKeyById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const key = await secretRotationService.getKeyById(id);
      if (!key) {
        res.status(404).json({ success: false, error: `Vault key '${id}' not found` });
        return;
      }
      res.json({ success: true, data: key });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createKey(req: Request, res: Response): Promise<void> {
    try {
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const newKey = await secretRotationService.createKey(req.body, operatorUserId);
      res.status(201).json({ success: true, data: newKey });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateKey(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const updated = await secretRotationService.updateKey(id, req.body, operatorUserId);
      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async rotateKey(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await secretRotationService.rotateKey(id, req.body, operatorUserId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async revokeKey(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const revoked = await secretRotationService.revokeKey(id, req.body, operatorUserId);
      res.json({ success: true, data: revoked });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteKey(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      await secretRotationService.deleteKey(id, operatorUserId);
      res.json({ success: true, message: `Vault key '${id}' deleted successfully` });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async simulateEnvelopeReEncrypt(req: Request, res: Response): Promise<void> {
    try {
      const result = secretRotationService.simulateEnvelopeReEncrypt(req.body);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const secretRotationController = new SecretRotationController();
