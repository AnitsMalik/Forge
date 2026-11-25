import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePlanGuard } from '../middleware/planLimits.js';

export const workspaceRouter = Router();

// Public invitation acceptance route (can be completed without an active session)
workspaceRouter.post('/invites/accept', WorkspaceController.acceptInvite);

// Protected Workspace Routes
workspaceRouter.use(authenticate);

workspaceRouter.get('/', WorkspaceController.listWorkspaces);
workspaceRouter.post('/', requirePlanGuard('agency_workspaces'), WorkspaceController.createWorkspace);
workspaceRouter.post('/switch', WorkspaceController.switchWorkspace);
workspaceRouter.get('/current', WorkspaceController.getCurrentWorkspaceSettings);
workspaceRouter.put('/current', WorkspaceController.updateCurrentWorkspaceSettings);
workspaceRouter.get('/quota', WorkspaceController.getActiveQuota);
workspaceRouter.get('/entitlements', WorkspaceController.getEntitlements);

// Team Members Management
workspaceRouter.get('/members', WorkspaceController.listMembers);
workspaceRouter.patch('/members/:userId/role', WorkspaceController.updateMemberRole);
workspaceRouter.delete('/members/:userId', WorkspaceController.removeMember);

// Team Invitations
workspaceRouter.get('/invites', WorkspaceController.listInvites);
workspaceRouter.post('/invites', requirePlanGuard('seats'), WorkspaceController.inviteMember);
workspaceRouter.delete('/invites/:inviteId', WorkspaceController.cancelInvite);
