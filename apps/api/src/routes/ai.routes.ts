import { Router } from 'express';
import { AiCopyController } from '../controllers/aiCopyController.js';
import { authenticate } from '../middleware/auth.js';
import { requirePlanGuard } from '../middleware/planLimits.js';

export const aiRouter = Router({ mergeParams: true });

aiRouter.use(authenticate);

aiRouter.post('/generate-copy', requirePlanGuard('ai_content'), AiCopyController.generateCopy);
aiRouter.post('/generate-content', requirePlanGuard('ai_content'), AiCopyController.generateContent);
aiRouter.post('/transform-copy', requirePlanGuard('ai_content'), AiCopyController.transformCopy);
aiRouter.post('/hashtags', AiCopyController.getHashtags);

