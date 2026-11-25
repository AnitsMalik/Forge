import { Router } from 'express';
import { ConnectionsController } from '../controllers/connections.controller.js';
import { authenticate } from '../middleware/auth.js';
import { requirePlanGuard } from '../middleware/planLimits.js';

const router = Router({ mergeParams: true });

// Public OAuth Redirect Callback (Meta and third-party dialog redirects with signed state)
router.get('/callback', ConnectionsController.handleOAuthCallbackGet);

// Protect subsequent Connect Hub endpoints with JWT authentication & tenant context
router.use(authenticate);

// 1. Catalog & Providers
router.get('/providers', ConnectionsController.listProviders);

// 2. Health Monitoring
router.get('/health', ConnectionsController.getTenantHealthSummary);

// 3. OAuth Flow Helpers
router.post('/authorize', ConnectionsController.getAuthorizationUrl);
router.post('/callback', ConnectionsController.handleOAuthCallback);

// 4. Resource Selection & 4-Stage Validation
router.get('/meta/discovered-pages', ConnectionsController.getDiscoveredMetaPages);
router.post('/meta/batch-pages', requirePlanGuard('social_accounts'), ConnectionsController.batchSelectMetaPages);
router.post('/select-resources', requirePlanGuard('social_accounts'), ConnectionsController.selectResources);
router.post('/:id/select-resources', requirePlanGuard('social_accounts'), ConnectionsController.selectResources);
router.patch('/resources/:resourceId/select', ConnectionsController.toggleResourceSelection);

// 5. Connection CRUD & Operations
router.get('/', ConnectionsController.listConnections);
router.post('/verify', ConnectionsController.verifyCredentials);
router.post('/', requirePlanGuard('social_accounts'), ConnectionsController.createConnection);
router.get('/:id', ConnectionsController.getConnection);
router.put('/:id', ConnectionsController.updateConnection);
router.delete('/:id', ConnectionsController.deleteConnection);

// 6. State Machine Transitions & Actions
router.post('/:id/test', ConnectionsController.testConnection);
router.post('/:id/reconnect', ConnectionsController.reconnectConnection);
router.post('/:id/disconnect', ConnectionsController.disconnectConnection);
router.post('/:id/health-check', ConnectionsController.triggerHealthCheck);
router.post('/:id/sync', ConnectionsController.syncDatasource);
router.post('/:id/discover', ConnectionsController.discoverResources);
router.get('/:id/health', ConnectionsController.getConnectionHealth);
router.get('/:id/resources', ConnectionsController.discoverResources);
router.get('/:id/events', ConnectionsController.listConnectionEvents);

// 7. Legacy Provider-Prefixed Fallbacks
router.get('/:provider/health', ConnectionsController.getConnectionHealth);
router.get('/:provider/resources', ConnectionsController.discoverResources);

export default router;
