import { Router } from 'express';
import {
  listPosts,
  getPostById,
  createPost,
  updatePost,
  updatePostVariant,
  regenerateSinglePost,
  transformPostVariant,
  schedulePost,
  publishPostNow,
  batchPublishPosts,
  retryPublishPost,
  deletePost,
  duplicatePost,
} from '../controllers/post.controller.js';
import { submitForApproval } from '../controllers/approval.controller.js';
import { authenticate } from '../middleware/auth.js';
import { enforcePlanLimit, requirePlanGuard } from '../middleware/planLimits.js';

export const postRouter = Router({ mergeParams: true });

postRouter.use(authenticate);

postRouter.get('/', listPosts);
postRouter.post('/', enforcePlanLimit('max_posts_per_month'), createPost);
postRouter.post('/batch-publish', enforcePlanLimit('max_posts_per_month'), batchPublishPosts);
postRouter.get('/:postId', getPostById);
postRouter.put('/:postId', updatePost);
postRouter.put('/:postId/variants/:platform', updatePostVariant);
postRouter.post('/:postId/regenerate', regenerateSinglePost);
postRouter.post('/:postId/transform', transformPostVariant);
postRouter.post('/:postId/schedule', enforcePlanLimit('max_posts_per_month'), requirePlanGuard('scheduled_posts'), schedulePost);
postRouter.post('/:postId/publish-now', enforcePlanLimit('max_posts_per_month'), publishPostNow);
postRouter.post('/:postId/retry', retryPublishPost);
postRouter.post('/:postId/duplicate', duplicatePost);
postRouter.delete('/:postId', deletePost);
postRouter.post('/:postId/submit-for-approval', enforcePlanLimit('client_approvals'), submitForApproval);


