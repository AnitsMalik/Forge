import type { Request, Response } from 'express';
import { jitAccessService } from '../services/superadmin/jitAccess.service.js';

export class JitAccessController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await jitAccessService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listRequests(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const requests = await jitAccessService.getRequests(status as string | undefined);
      res.json({ success: true, data: requests });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createRequest(req: Request, res: Response): Promise<void> {
    try {
      const { target_role, elevation_tier, justification, requested_duration_minutes } = req.body;
      if (!target_role || !justification) {
        res.status(400).json({ success: false, error: 'target_role and justification are required' });
        return;
      }

      const operatorId = (req as any).user?.userId || (req as any).user?.id || 'sys-op';
      const operatorEmail = (req as any).user?.email || 'operator@socialforge.io';

      const request = await jitAccessService.createRequest(
        { target_role, elevation_tier, justification, requested_duration_minutes },
        { id: operatorId, email: operatorEmail }
      );
      res.status(201).json({ success: true, data: request });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async approveRequest(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { approved, decision_notes } = req.body;
      if (typeof approved !== 'boolean') {
        res.status(400).json({ success: false, error: 'approved boolean is required' });
        return;
      }

      const approverId = (req as any).user?.userId || (req as any).user?.id || 'sys-approver';
      const approverEmail = (req as any).user?.email || 'security-lead@socialforge.io';

      const result = await jitAccessService.approveRequest(
        id,
        { approved, decision_notes },
        { id: approverId, email: approverEmail }
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      const isDualAuthError = err.message.includes('Dual-Authorization Violation');
      const isNotFound = err.message.includes('not found');
      res.status(isDualAuthError ? 403 : isNotFound ? 404 : 500).json({ success: false, error: err.message });
    }
  }

  async listLeases(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.query;
      const leases = await jitAccessService.getLeases(status as string | undefined);
      res.json({ success: true, data: leases });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async revokeLease(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      const operatorId = (req as any).user?.userId || (req as any).user?.id;
      const result = await jitAccessService.revokeLease(id, reason, operatorId);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(err.message.includes('not found') ? 404 : 500).json({ success: false, error: err.message });
    }
  }

  async listRules(req: Request, res: Response): Promise<void> {
    try {
      const rules = await jitAccessService.getRules();
      res.json({ success: true, data: rules });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listAuditSessions(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      const sessions = await jitAccessService.getAuditSessions(
        limit ? parseInt(limit as string, 10) : 50
      );
      res.json({ success: true, data: sessions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async simulateBreakGlass(req: Request, res: Response): Promise<void> {
    try {
      const { justification, duration_minutes } = req.body;
      if (!justification) {
        res.status(400).json({ success: false, error: 'justification is required for emergency break-glass elevation' });
        return;
      }

      const operatorId = (req as any).user?.userId || (req as any).user?.id || 'sys-op';
      const operatorEmail = (req as any).user?.email || 'emergency-operator@socialforge.io';

      const result = await jitAccessService.simulateBreakGlass(
        { justification, duration_minutes },
        { id: operatorId, email: operatorEmail }
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const jitAccessController = new JitAccessController();
