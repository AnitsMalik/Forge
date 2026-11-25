import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePlanGuard } from '../middleware/planLimits.js';

export const whatsappRouter = Router({ mergeParams: true });

// Inbound webhook from Meta (verified separately)
whatsappRouter.get('/webhook', WhatsAppController.verifyWebhook);
whatsappRouter.post('/webhook', WhatsAppController.handleWebhook);
whatsappRouter.post('/inbound', WhatsAppController.receiveInbound);

// All tenant WhatsApp marketing endpoints require authentication & plan entitlement
whatsappRouter.use(authenticate);
whatsappRouter.use(requirePlanGuard('whatsapp'));

// Provider Configuration Status & Billing Notifications
whatsappRouter.get('/provider-status', WhatsAppController.getProviderStatus);
whatsappRouter.get('/billing-notifications', WhatsAppController.listBillingNotifications);
whatsappRouter.post('/billing-notifications/:id/retry', WhatsAppController.retryBillingNotification);

// Account configuration
whatsappRouter.get('/account', WhatsAppController.getAccount);
whatsappRouter.post('/account', WhatsAppController.connectAccount);

// Approved Templates
whatsappRouter.get('/templates', WhatsAppController.listTemplates);
whatsappRouter.post('/templates', WhatsAppController.createTemplate);

// Broadcast Campaigns
whatsappRouter.get('/campaigns', WhatsAppController.listCampaigns);
whatsappRouter.post('/campaigns', WhatsAppController.createCampaign);
whatsappRouter.post('/campaigns/:campaignId/dispatch', WhatsAppController.dispatchCampaign);

// 2-Way Conversations & Inbound/Outbound Messaging
whatsappRouter.get('/conversations', WhatsAppController.listConversations);
whatsappRouter.get('/conversations/:phoneNumber', WhatsAppController.getThread);
whatsappRouter.post('/send', WhatsAppController.sendMessage);

export default whatsappRouter;

