import { Router } from 'express';
import { VideoController } from '../controllers/videoController.js';
import { authenticate } from '../middleware/auth.js';
import { enforcePlanLimit, requirePlanGuard } from '../middleware/planLimits.js';

export const videoRouter = Router({ mergeParams: true });

videoRouter.use(authenticate);

videoRouter.get('/templates', VideoController.listTemplates);
videoRouter.post('/storyboard', requirePlanGuard('ai_videos'), VideoController.generateStoryboard);
videoRouter.post('/scenes/regenerate', VideoController.regenerateScene);
videoRouter.post('/tts', VideoController.synthesizeSpeech);
videoRouter.post('/render', requirePlanGuard('ai_videos'), VideoController.renderVideo);
videoRouter.get('/jobs', VideoController.listJobs);
videoRouter.get('/jobs/:jobId', VideoController.getJobStatus);
videoRouter.post('/jobs/:jobId/retry', enforcePlanLimit('video_render_seconds_monthly'), VideoController.retryJob);

