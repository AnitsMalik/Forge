import { Router } from 'express';
import {
  connectMeta,
  metaCallback,
  getMetaStatus,
  getConnectionHealth,
  listDiscoveredPages,
  selectPage,
  importDevToken,
  validateToken,
  testMetaConnection,
  publishMetaContent,
  agentPublish,
  listPublishingJobs,
  listPublishingAuditLogs,
  updateMetaSettings,
  disconnectMeta,
  getReconnectUrl,
} from '../controllers/meta.controller.js';
import { authenticate } from '../middleware/auth.js';
import {
  oauthConnectRateLimiter,
  oauthCallbackRateLimiter,
} from '../middleware/rateLimiter.js';

// Router for public OAuth endpoints with distributed rate limiting
export const publicMetaOAuthRouter = Router();
publicMetaOAuthRouter.get('/connect', oauthConnectRateLimiter, connectMeta);
publicMetaOAuthRouter.get('/callback', oauthCallbackRateLimiter, metaCallback);

// Router for brand-scoped Meta management endpoints
export const metaBrandRouter = Router({ mergeParams: true });
metaBrandRouter.use(authenticate);

metaBrandRouter.get('/status', getMetaStatus);
metaBrandRouter.get('/reconnect', getReconnectUrl);
metaBrandRouter.post('/reconnect', getReconnectUrl);
metaBrandRouter.get('/health', getConnectionHealth);
metaBrandRouter.post('/health-check', getConnectionHealth);
metaBrandRouter.get('/pages', listDiscoveredPages);
metaBrandRouter.post('/select-page', selectPage);
metaBrandRouter.post('/dev-token', importDevToken);
metaBrandRouter.post('/validate-token', validateToken);
metaBrandRouter.post('/test', testMetaConnection);
metaBrandRouter.post('/publish', publishMetaContent);
metaBrandRouter.post('/agent/publish', agentPublish);
metaBrandRouter.get('/jobs', listPublishingJobs);
metaBrandRouter.get('/audit-logs', listPublishingAuditLogs);
metaBrandRouter.put('/settings', updateMetaSettings);
metaBrandRouter.post('/disconnect', disconnectMeta);
