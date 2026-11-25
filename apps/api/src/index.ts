import fs from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { brandRouter } from './routes/brand.routes.js';
import { postRouter } from './routes/post.routes.js';
import { approvalRouter } from './routes/approval.routes.js';
import { templateRouter } from './routes/template.routes.js';
import { mediaRouter } from './routes/media.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { videoRouter } from './routes/video.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { socialAccountRouter } from './routes/socialAccount.routes.js';
import { campaignRouter } from './routes/campaign.routes.js';
import { publicMetaOAuthRouter, metaBrandRouter } from './routes/meta.routes.js';
import { workspaceRouter } from './routes/workspace.routes.js';
import { billingRouter } from './routes/billing.routes.js';
import { adminBillingRouter } from './routes/adminBilling.routes.js';
import { superadminOpsRouter } from './routes/superadminOps.routes.js';
import { scimRouter } from './routes/scim.routes.js';
import automationRouter from './routes/automation.routes.js';
import connectionsRouter from './routes/connections.routes.js';
import onboardingRouter from './routes/onboarding.routes.js'; // active onboarding pipeline
import agentRouter from './routes/agent.routes.js';
import dataRouter from './routes/data.routes.js';
import { governanceRouter } from './routes/governance.routes.js';
import { growthRouter } from './routes/growth.routes.js';
import { socialWebhookRouter } from './routes/socialWebhook.routes.js';
import { SlaStatusController } from './controllers/slaStatus.controller.js';
import { publicWormVerifyRouter } from './routes/wormVerify.routes.js';
import { whiteLabelRouter } from './routes/whiteLabel.routes.js';
import { WormSealScheduler } from './services/superadmin/wormVault.service.js';
import crmRouter from './routes/crm.routes.js';
import emailMarketingRouter from './routes/emailMarketing.routes.js';
import { EmailMarketingService } from './services/emailMarketing/emailMarketing.service.js';
import whatsappRouter from './routes/whatsapp.routes.js';
import { WhatsAppController } from './controllers/whatsapp.controller.js';
import smsVoiceRouter from './routes/smsVoice.routes.js';
import './connectors/index.js';

import { authRateLimiter, magicLinkRateLimiter, generalApiRateLimiter } from './middleware/rateLimiter.js';
import { authenticate } from './middleware/auth.js';
import { validateBrandTenant } from './middleware/tenant.js';

import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { MetaAnalyticsScheduler } from './services/meta/analyticsScheduler.js';
import { ConnectionHealthScheduler } from './services/connections/connectionHealthScheduler.js';
import { PublishingWorkerScheduler } from './services/queues/publishingWorkerScheduler.js';

import { cookieParser, validateCsrf } from './middleware/cookieAuth.js';

const app = express();

// Security headers and middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    xContentTypeOptions: true,
    xDnsPrefetchControl: { allow: false },
    xFrameOptions: { action: 'deny' },
    xXssProtection: true,
    hidePoweredBy: true,
  })
);

const allowedOrigins = [
  config.webAppUrl,
  'https://forge.hoasp.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true;
  const normalizedOrigin = origin.replace(/\/+$/, '');
  const normalizedWebUrl = config.webAppUrl ? config.webAppUrl.replace(/\/+$/, '') : '';
  
  if (normalizedOrigin === normalizedWebUrl) return true;
  if (allowedOrigins.some(o => o && o.replace(/\/+$/, '') === normalizedOrigin)) return true;

  // Allow any hoasp.com domain and subdomains
  if (/^https?:\/\/([a-zA-Z0-9-]+\.)*hoasp\.com(:\d+)?$/i.test(normalizedOrigin)) {
    return true;
  }

  // In development/test mode, allow any localhost, 127.0.0.1, or local LAN IP on any port
  if (config.nodeEnv !== 'production') {
    if (/^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(normalizedOrigin)) {
      return true;
    }
    if (/^https?:\/\/[^/]+\.(local|test)(:\d+)?$/.test(normalizedOrigin)) {
      return true;
    }
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-tenant-id', 'x-verification-token', 'x-bypass-rate-limit'],
  })
);
app.use(cookieParser);
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(validateCsrf);

// Serve static uploads (rendered videos, poster thumbnails, media assets)
const uploadsPaths = [
  path.join(process.cwd(), 'uploads'),
  path.resolve(process.cwd(), '../../uploads'),
  path.resolve(__dirname, '../../../uploads'),
  path.resolve(__dirname, '../../uploads'),
];
for (const uPath of uploadsPaths) {
  if (fs.existsSync(uPath)) {
    app.use('/uploads', express.static(uPath));
  }
}

// Health & Status routes
app.use(healthRouter);
app.get('/api/v1/status', (req, res) => SlaStatusController.getPublicStatus(req, res));
app.get('/api/status', (req, res) => SlaStatusController.getPublicStatus(req, res));

// Global DDoS Mitigation Rate Limiter on API v1
app.use('/api/v1', generalApiRateLimiter);

// Public Auth Endpoints
app.use('/api/v1/auth', authRouter);

// SaaS Workspace Management & Quota Endpoints
app.use('/api/v1/workspaces', workspaceRouter);

// SaaS Billing & Stripe Integration Endpoints
app.use('/api/v1/billing', billingRouter);
app.use('/api/v1/admin/billing', adminBillingRouter);
app.use('/api/v1/admin/operations', superadminOpsRouter);

// External Legal Verification Portal for the WORM Audit Vault (token-gated, no user session)
app.use('/api/v1/public/worm-verify', publicWormVerifyRouter);

// Public White-Label Portal & Custom Domain Routing
app.use('/api/v1/public/white-label', whiteLabelRouter);

// SCIM 2.0 Directory Sync & Workforce Lifecycle Protocol Endpoints (RFC 7643 / RFC 7644)
app.use('/api/v1/scim/v2', scimRouter);
app.use('/scim/v2', scimRouter);

// Meta OAuth Flow Endpoints (Accessible both at /api/v1/integrations/meta and /api/integrations/meta)
app.use('/api/v1/integrations/meta', publicMetaOAuthRouter);
app.use('/api/integrations/meta', publicMetaOAuthRouter);

// Real-Time Social Webhook Ingestion Endpoints (Meta, Instagram, TikTok, Generic)
app.use('/api/v1/webhooks/social', socialWebhookRouter);
app.use('/api/webhooks/social', socialWebhookRouter);

// Meta WhatsApp Cloud API Inbound Webhooks
app.get('/api/v1/webhooks/whatsapp', WhatsAppController.verifyWebhook);
app.post('/api/v1/webhooks/whatsapp', WhatsAppController.handleWebhook);
app.use('/api/v1/whatsapp', whatsappRouter);

// Magic Link Public Approvals with Replay / Brute-Force Rate Limiter
app.use('/api/v1/approvals/magic', magicLinkRateLimiter);
app.use('/api/v1/approvals', approvalRouter);
app.use('/api/v1/automations', automationRouter);
app.use('/api/v1/connections', connectionsRouter);
app.use('/api/v1/onboarding', onboardingRouter);
app.use('/api/v1/agent', agentRouter);
app.use('/agent', agentRouter);
app.use('/api/v1/data', dataRouter);
app.use('/api/v1/governance', governanceRouter);
app.use('/governance', governanceRouter);
app.use('/api/v1/growth', growthRouter);
app.use('/growth', growthRouter);
app.use('/api/v1/templates', templateRouter);
app.use('/templates', templateRouter);

// Public Email Marketing Tracking & Unsubscribe Endpoints
app.get('/api/v1/email/track/open/:deliveryId', async (req, res) => {
  try {
    await EmailMarketingService.trackOpen(req.params.deliveryId);
  } catch (err) {
    // Silently ignore telemetry failure
  }
  // 1x1 transparent GIF
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
  });
  return res.end(pixel);
});

app.get('/api/v1/email/track/click/:deliveryId', async (req, res) => {
  const { url } = req.query;
  try {
    await EmailMarketingService.trackClick(req.params.deliveryId);
  } catch (err) {
    // Silently ignore telemetry failure
  }
  const destination = typeof url === 'string' && url.startsWith('http') ? url : 'https://socialforge.ai';
  return res.redirect(302, destination);
});

app.get('/api/v1/email/unsubscribe', async (req, res) => {
  const { subId, b } = req.query;
  try {
    if (subId && b) {
      const brand = await (await import('./db/connection.js')).db('brands').where({ id: b as string }).first();
      if (brand) {
        await EmailMarketingService.unsubscribe(brand.tenant_id, b as string, subId as string);
      }
    }
  } catch (err) {
    // ignore
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  return res.end(`
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"><title>Unsubscribed</title></head>
      <body style="font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
        <div style="text-align: center; max-width: 420px; padding: 32px; background: #1e293b; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1);">
          <h2 style="margin-top: 0; color: #10b981;">Unsubscribed Successfully</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.5;">You have been safely removed from marketing broadcasts. You will no longer receive campaign emails from this brand.</p>
        </div>
      </body>
    </html>
  `);
});


// Brand-Level Tenant Isolation Guard on all /api/v1/brands/:brandId/* sub-routes
// Enforces that the requesting user's tenantId owns :brandId, returning 404 on cross-tenant access
app.use('/api/v1/brands/:brandId', authenticate, validateBrandTenant);

// Brand Sub-routes
app.use('/api/v1/brands/:brandId/templates', templateRouter);
app.use('/api/v1/brands/:brandId/media', mediaRouter);
app.use('/api/v1/brands/:brandId/videos', videoRouter);
app.use('/api/brands/:brandId/videos', authenticate, validateBrandTenant, videoRouter);
app.use('/api/v1/brands/:brandId/ai', aiRouter);
app.use('/api/v1/brands/:brandId/analytics', analyticsRouter);
app.use('/api/v1/brands/:brandId/posts', postRouter);
app.use('/api/v1/brands/:brandId/campaigns', campaignRouter);
app.use('/api/v1/brands/:brandId/social-accounts', socialAccountRouter);
app.use('/api/v1/brands/:brandId/integrations/meta', metaBrandRouter);
app.use('/api/v1/brands/:brandId/automations', automationRouter);
app.use('/api/v1/brands/:brandId/connections', connectionsRouter);
app.use('/api/v1/brands/:brandId/agent', agentRouter);
app.use('/api/v1/brands/:brandId/data', dataRouter);
app.use('/api/v1/brands/:brandId/governance', governanceRouter);
app.use('/api/v1/brands/:brandId/growth', growthRouter);
app.use('/api/v1/brands/:brandId/crm', crmRouter);
app.use('/api/v1/brands/:brandId/email', emailMarketingRouter);
app.use('/api/v1/brands/:brandId/whatsapp', whatsappRouter);
app.use('/api/v1/brands/:brandId/sms-voice', smsVoiceRouter);
app.use('/api/v1/brands', brandRouter);

// Static Web Frontend Serving (Vite SPA Production Build)
const webDistPath = path.resolve(__dirname, '../../web/dist');
const webCwdDistPath = path.resolve(process.cwd(), 'apps/web/dist');
const resolvedDist = fs.existsSync(webDistPath)
  ? webDistPath
  : fs.existsSync(webCwdDistPath)
    ? webCwdDistPath
    : null;

if (resolvedDist) {
  app.use(express.static(resolvedDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(resolvedDist, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`=========================================`);
  console.log(`  SocialForge API Server Running`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Port:        ${config.port}`);
  console.log(`  URL:         http://localhost:${config.port}`);
  console.log(`=========================================`);

  // Start background auto-sync scheduler for Meta Analytics
  MetaAnalyticsScheduler.start();

  // Start automated connection health monitor & failure recovery scheduler
  ConnectionHealthScheduler.start();

  // Start WORM audit vault ingestion + daily cryptographic sealing scheduler
  WormSealScheduler.start();

  // Start automated multi-channel background publishing queue worker & scheduler
  PublishingWorkerScheduler.start();
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  MetaAnalyticsScheduler.stop();
  ConnectionHealthScheduler.stop();
  WormSealScheduler.stop();
  PublishingWorkerScheduler.stop();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

export default app;
