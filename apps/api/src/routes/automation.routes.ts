import { Router } from 'express';
import {
  listAutomations,
  getAutomation,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  triggerAutomation,
  triggerDurableRun,
  pauseAutomation,
  resumeAutomation,
  cancelAutomation,
  cancelRun,
  listRunSteps,
  listDlqItems,
  replayDlqItem,
  discardDlqItem,
  dispatchTrigger,
  handleInboundWebhook,
  listAutomationRuns,
  listRecipes,
  instantiateRecipe,
  getAutomationHealth,
  getAutomationMetrics,
  approveRun,
  reconcileStalledRuns,
} from '../controllers/automation.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { enforcePlanLimit } from '../middleware/planLimits.js';

const router = Router();

// Public webhook ingress (authenticated via opaque webhook token in path)
router.post('/webhook/:token', handleInboundWebhook);

// Authenticated Automation API routes
router.use(requireAuth);

// Non-parameterized routes (must precede /:id)
router.get('/health', getAutomationHealth);
router.get('/metrics', getAutomationMetrics);
router.get('/recipes', listRecipes);
router.post('/recipes/:recipeId/instantiate', enforcePlanLimit('active_automations'), instantiateRecipe);
router.get('/runs', listAutomationRuns);
router.post('/runs/reconcile', reconcileStalledRuns);
router.post('/runs/:runId/approve', approveRun);

// Stage 5 DLQ Management
router.get('/dlq', listDlqItems);
router.post('/dlq/:id/replay', replayDlqItem);
router.delete('/dlq/:id', discardDlqItem);

// Universal Trigger Dispatcher
router.post('/triggers/dispatch', dispatchTrigger);

// Run Management
router.post('/runs/:runId/cancel', cancelRun);
router.get('/runs/:runId/steps', listRunSteps);

// Automation CRUD & Lifecycle Controls
router.get('/', listAutomations);
router.post('/', enforcePlanLimit('active_automations'), createAutomation);
router.get('/:id', getAutomation);
router.put('/:id', updateAutomation);
router.delete('/:id', deleteAutomation);
router.post('/:id/pause', pauseAutomation);
router.post('/:id/resume', enforcePlanLimit('active_automations'), resumeAutomation);
router.post('/:id/cancel', cancelAutomation);
router.post('/:id/trigger', triggerAutomation);
router.post('/:id/execute-durable', triggerDurableRun);
router.get('/:id/runs', listAutomationRuns);

export default router;
