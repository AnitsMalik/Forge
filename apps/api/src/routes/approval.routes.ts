import { Router } from 'express';
import { getMagicPreview, actOnMagicLink } from '../controllers/approval.controller.js';

export const approvalRouter = Router();

// Public token-based endpoints for external clients
approvalRouter.get('/magic/:token', getMagicPreview);
approvalRouter.post('/magic/:token/action', actOnMagicLink);
