import type { Request, Response, NextFunction } from 'express';
import { complianceService } from '../services/superadmin/compliance.service.js';

export class ComplianceController {
  async verifyAuditIntegrity(req: Request, res: Response, next: NextFunction) {
    try {
      const table = (req.query.table as string) || 'superadmin_audit_logs';
      const result = await complianceService.verifyAuditTrailIntegrity(table);
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async listExports(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const exports = await complianceService.listExports(tenantId);
      return res.status(200).json({ success: true, data: exports });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async requestExport(req: Request, res: Response, next: NextFunction) {
    try {
      const requester = {
        id: req.user!.userId,
        email: req.user!.email,
        tenantId: req.user!.tenantId,
      };
      const exportJob = await complianceService.requestExport(req.body, requester);
      return res.status(201).json({ success: true, data: exportJob });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async listRetentionPolicies(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const policies = await complianceService.listRetentionPolicies(tenantId);
      return res.status(200).json({ success: true, data: policies });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateRetentionPolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const superadmin = {
        id: req.user!.userId,
        email: req.user!.email,
      };
      const policy = await complianceService.updateRetentionPolicy(req.params.id, req.body, superadmin);
      return res.status(200).json({ success: true, data: policy });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async executeDataPurge(req: Request, res: Response, next: NextFunction) {
    try {
      const superadmin = {
        id: req.user!.userId,
        email: req.user!.email,
        tenantId: req.user!.tenantId,
      };
      const cert = await complianceService.executeDataPurge(req.body, superadmin);
      return res.status(200).json({ success: true, data: { certificate: cert, recordsPurged: cert.recordsPurged } });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async listRoles(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.query.tenantId as string | undefined;
      const roles = await complianceService.listRoles(tenantId);
      return res.status(200).json({ success: true, data: roles });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async createCustomRole(req: Request, res: Response, next: NextFunction) {
    try {
      const superadmin = {
        id: req.user!.userId,
        email: req.user!.email,
      };
      const role = await complianceService.createCustomRole(req.body, superadmin);
      return res.status(201).json({ success: true, data: role });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async listPermissions(req: Request, res: Response, next: NextFunction) {
    try {
      const permissions = complianceService.listAllPermissions();
      return res.status(200).json({ success: true, data: permissions });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const complianceController = new ComplianceController();
