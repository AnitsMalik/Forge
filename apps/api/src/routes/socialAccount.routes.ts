import { Router } from 'express';
import {
  listAccounts,
  getAccountDetails,
  connectAccount,
  reconnectAccount,
  testConnection,
  disconnectAccount,
  seedSandboxAccounts,
  getPublishLogs,
} from '../controllers/socialAccount.controller.js';
import { authenticate } from '../middleware/auth.js';
import { enforcePlanLimit } from '../middleware/planLimits.js';

export const socialAccountRouter = Router({ mergeParams: true });

socialAccountRouter.use(authenticate);

socialAccountRouter.get('/', listAccounts);
socialAccountRouter.post('/', enforcePlanLimit('max_social_accounts'), connectAccount);
socialAccountRouter.post('/sandbox/seed', enforcePlanLimit('max_social_accounts'), seedSandboxAccounts);
socialAccountRouter.get('/logs', getPublishLogs);
socialAccountRouter.get('/:accountId', getAccountDetails);
socialAccountRouter.post('/:accountId/reconnect', reconnectAccount);
socialAccountRouter.post('/:accountId/test', testConnection);
socialAccountRouter.delete('/:accountId', disconnectAccount);
