import { Router } from 'express';
import { SocialWebhookController } from '../controllers/socialWebhook.controller.js';

export const socialWebhookRouter = Router();

// Meta Graph API Webhook (Challenge GET & Ingestion POST)
socialWebhookRouter.get('/meta', SocialWebhookController.handleMetaChallenge);
socialWebhookRouter.post('/meta', SocialWebhookController.handleMetaIncoming);

// Instagram Graph API Webhook
socialWebhookRouter.get('/instagram', SocialWebhookController.handleMetaChallenge);
socialWebhookRouter.post('/instagram', SocialWebhookController.handleInstagramIncoming);

// TikTok Webhook
socialWebhookRouter.post('/tiktok', SocialWebhookController.handleTikTokIncoming);

// Generic / Custom Social Webhook
socialWebhookRouter.post('/generic', SocialWebhookController.handleGenericIncoming);
