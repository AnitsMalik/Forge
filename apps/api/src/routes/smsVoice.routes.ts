import { Router } from 'express';
import { SmsVoiceController } from '../controllers/smsVoice.controller.js';
import { authenticate } from '../middleware/auth.js';

export const smsVoiceRouter = Router({ mergeParams: true });

// Public Inbound Webhook (Carrier / Twilio callbacks)
smsVoiceRouter.post('/inbound', SmsVoiceController.receiveInbound);

// Protect all subsequent SMS & Voice management endpoints with JWT authentication
smsVoiceRouter.use(authenticate);

// SMS Sender & 10DLC
smsVoiceRouter.get('/sender', SmsVoiceController.getSender);
smsVoiceRouter.post('/sender', SmsVoiceController.configureSender);
smsVoiceRouter.post('/calculate-segments', SmsVoiceController.calculateSegments);

// SMS Broadcast Campaigns
smsVoiceRouter.get('/campaigns', SmsVoiceController.listCampaigns);
smsVoiceRouter.post('/campaigns', SmsVoiceController.createCampaign);
smsVoiceRouter.post('/campaigns/:campaignId/dispatch', SmsVoiceController.dispatchCampaign);

// Direct SMS Messages
smsVoiceRouter.get('/messages', SmsVoiceController.listMessages);
smsVoiceRouter.post('/send', SmsVoiceController.sendSms);

// Voice AI Agent & Calling
smsVoiceRouter.get('/voice/agent', SmsVoiceController.getVoiceAgent);
smsVoiceRouter.put('/voice/agent', SmsVoiceController.updateVoiceAgent);
smsVoiceRouter.get('/voice/calls', SmsVoiceController.listVoiceCalls);
smsVoiceRouter.post('/voice/calls', SmsVoiceController.triggerVoiceCall);

export default smsVoiceRouter;

