import { Router } from 'express';
import { MediaController } from '../controllers/mediaController.js';
import { authenticate } from '../middleware/auth.js';
import { enforcePlanLimit } from '../middleware/planLimits.js';

export const mediaRouter = Router({ mergeParams: true });

mediaRouter.use(authenticate);

mediaRouter.get('/', MediaController.listMedia);
mediaRouter.get('/storage-summary', MediaController.getStorageSummary);
mediaRouter.post('/bulk', enforcePlanLimit('storage_bytes_limit'), MediaController.bulkCreateMedia);
mediaRouter.post('/bulk-delete', MediaController.bulkDeleteMedia);
mediaRouter.post('/bulk-update', MediaController.bulkUpdateMedia);
mediaRouter.post('/', enforcePlanLimit('storage_bytes_limit'), MediaController.createMedia);
mediaRouter.get('/:assetId', MediaController.getMediaById);
mediaRouter.patch('/:assetId', MediaController.updateMedia);
mediaRouter.put('/:assetId', MediaController.updateMedia);
mediaRouter.post('/:assetId/duplicate', enforcePlanLimit('storage_bytes_limit'), MediaController.duplicateMedia);
mediaRouter.delete('/:assetId', MediaController.deleteMedia);
