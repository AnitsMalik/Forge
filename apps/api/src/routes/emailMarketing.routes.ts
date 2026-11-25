import { Router } from 'express';
import { EmailMarketingController } from '../controllers/emailMarketing.controller.js';
import { authenticate } from '../middleware/auth.js';

export const emailMarketingRouter = Router({ mergeParams: true });

// Protect all tenant Email Marketing endpoints with JWT authentication
emailMarketingRouter.use(authenticate);

// Subscribers
emailMarketingRouter.get('/subscribers', EmailMarketingController.listSubscribers);
emailMarketingRouter.post('/subscribers', EmailMarketingController.createSubscriber);
emailMarketingRouter.post('/subscribers/bulk', EmailMarketingController.bulkImportSubscribers);
emailMarketingRouter.post('/subscribers/sync-crm', EmailMarketingController.syncCrmContacts);
emailMarketingRouter.delete('/subscribers/:subscriberId', EmailMarketingController.unsubscribe);

// Templates
emailMarketingRouter.get('/templates', EmailMarketingController.listTemplates);
emailMarketingRouter.post('/templates', EmailMarketingController.createTemplate);
emailMarketingRouter.put('/templates/:templateId', EmailMarketingController.updateTemplate);
emailMarketingRouter.delete('/templates/:templateId', EmailMarketingController.deleteTemplate);

// Campaigns
emailMarketingRouter.get('/campaigns', EmailMarketingController.listCampaigns);
emailMarketingRouter.post('/campaigns', EmailMarketingController.createCampaign);
emailMarketingRouter.post('/campaigns/:campaignId/send', EmailMarketingController.sendCampaign);
emailMarketingRouter.get('/campaigns/:campaignId/deliveries', EmailMarketingController.getCampaignDeliveries);
emailMarketingRouter.delete('/campaigns/:campaignId', EmailMarketingController.deleteCampaign);

// Testing
emailMarketingRouter.post('/send-test', EmailMarketingController.sendTestEmail);

// ESP & SMTP Configuration
emailMarketingRouter.get('/esp-config', EmailMarketingController.getEspConfig);
emailMarketingRouter.put('/esp-config', EmailMarketingController.saveEspConfig);
emailMarketingRouter.post('/esp-config/test', EmailMarketingController.testEspConfig);
emailMarketingRouter.post('/esp-config/verify-dns', EmailMarketingController.verifyDomainDns);
emailMarketingRouter.post('/esp-config/disconnect', EmailMarketingController.disconnectEspConfig);

export default emailMarketingRouter;

