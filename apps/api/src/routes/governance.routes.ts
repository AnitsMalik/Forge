import { Router } from 'express';
import { governanceController } from '../controllers/governance.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const governanceRouter = Router();

// All governance endpoints require authenticated JWT
governanceRouter.use(requireAuth);

// 1. Settings & Autonomy Levels
governanceRouter.get('/settings', (req, res, next) => governanceController.getSettings(req, res, next));
governanceRouter.put('/settings', (req, res, next) => governanceController.updateSettings(req, res, next));
governanceRouter.post('/autonomy-level', (req, res, next) => governanceController.setAutonomyLevel(req, res, next));

// 2. Human Override / Emergency Kill-Switch
governanceRouter.post('/override/pause', (req, res, next) => governanceController.pauseAutomations(req, res, next));
governanceRouter.post('/override/resume', (req, res, next) => governanceController.resumeAutomations(req, res, next));

// 3. Policy Engine Evaluation
governanceRouter.post('/policy/evaluate', (req, res, next) => governanceController.evaluatePolicy(req, res, next));

// 4. Approval Center
governanceRouter.get('/approvals', (req, res, next) => governanceController.listApprovals(req, res, next));
governanceRouter.get('/approvals/:id', (req, res, next) => governanceController.getApproval(req, res, next));
governanceRouter.get('/approvals/:id/preview', (req, res, next) => governanceController.previewApproval(req, res, next));
governanceRouter.put('/approvals/:id', (req, res, next) => governanceController.editApproval(req, res, next));
governanceRouter.post('/approvals/:id/approve', (req, res, next) => governanceController.approveApproval(req, res, next));
governanceRouter.post('/approvals/:id/reject', (req, res, next) => governanceController.rejectApproval(req, res, next));
governanceRouter.post('/approvals/bulk-approve', (req, res, next) => governanceController.bulkApproveApprovals(req, res, next));

// 5. Governance Audit Logs
governanceRouter.get('/audit-logs', (req, res, next) => governanceController.getAuditLogs(req, res, next));
