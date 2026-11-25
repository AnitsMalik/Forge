import { Router } from 'express';
import { CampaignController } from '../controllers/campaign.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePlanGuard } from '../middleware/planLimits.js';

export const campaignRouter = Router({ mergeParams: true });

campaignRouter.use(authenticate);

// List all campaigns for a brand
campaignRouter.get('/', CampaignController.listCampaigns);

// Preview AI Campaign Strategy from 1 business idea (dry-run)
campaignRouter.post('/strategy', CampaignController.previewStrategy);

// 1-Click: Create Campaign & Generate all Coordinated Posts & Platform Variants
campaignRouter.post('/generate', requirePlanGuard('active_campaigns'), CampaignController.createAndGenerateCampaign);

// Get single campaign with all nested posts and platform variants
campaignRouter.get('/:campaignId', CampaignController.getCampaignById);

// 1-Click batch reschedule of all posts across calendar
campaignRouter.post('/:campaignId/schedule', CampaignController.batchScheduleCampaign);

// 1-Click batch publish of all unpublished posts in campaign
campaignRouter.post('/:campaignId/publish-now', CampaignController.batchPublishCampaign);

// Update campaign metadata or status
campaignRouter.put('/:campaignId', CampaignController.updateCampaign);

// Delete campaign
campaignRouter.delete('/:campaignId', CampaignController.deleteCampaign);
