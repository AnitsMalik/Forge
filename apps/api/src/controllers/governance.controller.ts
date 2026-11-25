import type { Request, Response, NextFunction } from 'express';
import { governancePolicyService } from '../services/governance/governancePolicy.service.js';
import { approvalCenterService } from '../services/governance/approvalCenter.service.js';
import { governanceAuditService } from '../services/governance/governanceAudit.service.js';

export class GovernanceController {
  public async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const brandId = (req.query.brandId as string) || (req.params.brandId as string);
      if (!brandId) {
        return res.status(400).json({ success: false, error: 'brandId is required.' });
      }

      const settings = await governancePolicyService.getSettings(tenantId, brandId);
      return res.status(200).json({ success: true, data: settings });
    } catch (err) {
      return next(err);
    }
  }

  public async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const brandId = req.body.brandId || req.query.brandId;
      if (!brandId) {
        return res.status(400).json({ success: false, error: 'brandId is required.' });
      }

      const updated = await governancePolicyService.updateSettings(
        tenantId,
        brandId,
        req.body,
        userId
      );
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return next(err);
    }
  }

  public async setAutonomyLevel(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { brandId, level, reason } = req.body;
      if (!brandId || !level) {
        return res.status(400).json({ success: false, error: 'brandId and level are required.' });
      }

      const updated = await governancePolicyService.setAutonomyLevel(
        tenantId,
        brandId,
        level,
        userId,
        reason
      );
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return next(err);
    }
  }

  public async pauseAutomations(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { brandId, reason } = req.body;

      const result = await governancePolicyService.pauseAllAutomations(
        tenantId,
        brandId,
        reason,
        userId
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  public async resumeAutomations(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { brandId, reason } = req.body;

      const result = await governancePolicyService.resumeAllAutomations(
        tenantId,
        brandId,
        reason,
        userId
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  public async evaluatePolicy(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { brandId, action, content, channel, estimatedCost } = req.body;

      if (!brandId || !action) {
        return res.status(400).json({ success: false, error: 'brandId and action are required.' });
      }

      const evaluation = await governancePolicyService.evaluatePolicy({
        tenantId,
        brandId,
        userId,
        action,
        content,
        channel,
        estimatedCost,
      });

      return res.status(200).json({ success: true, data: evaluation });
    } catch (err) {
      return next(err);
    }
  }

  public async listApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { brandId, status, entityType, limit, offset } = req.query;

      const approvals = await approvalCenterService.listApprovalRequests(tenantId, {
        brandId: brandId as string,
        status: status as string,
        entityType: entityType as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      return res.status(200).json({ success: true, data: approvals });
    } catch (err) {
      return next(err);
    }
  }

  public async getApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;

      const approval = await approvalCenterService.getApprovalRequest(tenantId, id);
      if (!approval) {
        return res.status(404).json({ success: false, error: 'Approval request not found.' });
      }

      return res.status(200).json({ success: true, data: approval });
    } catch (err) {
      return next(err);
    }
  }

  public async previewApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;

      const previewData = await approvalCenterService.previewApprovalRequest(tenantId, id);
      return res.status(200).json({ success: true, data: previewData });
    } catch (err) {
      return next(err);
    }
  }

  public async editApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { id } = req.params;

      const updated = await approvalCenterService.editApprovalRequest(
        tenantId,
        id,
        req.body,
        userId
      );
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return next(err);
    }
  }

  public async approveApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { id } = req.params;
      const { notes } = req.body;

      const result = await approvalCenterService.approveRequest(tenantId, id, userId, notes);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  public async rejectApproval(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { id } = req.params;
      const { notes } = req.body;

      const result = await approvalCenterService.rejectRequest(tenantId, id, userId, notes);
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  public async bulkApproveApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.user!.userId;
      const { brandId, approvalIds, notes } = req.body;

      if (!brandId || !Array.isArray(approvalIds) || approvalIds.length === 0) {
        return res.status(400).json({ success: false, error: 'brandId and approvalIds array are required.' });
      }

      const result = await approvalCenterService.bulkApprove(
        tenantId,
        brandId,
        approvalIds,
        userId,
        notes
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return next(err);
    }
  }

  public async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const tenantId = req.user!.tenantId;
      const { brandId, eventType, status, limit, offset } = req.query;

      const logs = await governanceAuditService.getAuditLogs(tenantId, {
        brandId: brandId as string,
        eventType: eventType as string,
        status: status as string,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
      });

      return res.status(200).json({ success: true, data: logs });
    } catch (err) {
      return next(err);
    }
  }
}

export const governanceController = new GovernanceController();
