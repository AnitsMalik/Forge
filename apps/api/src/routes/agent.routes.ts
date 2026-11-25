import { Router } from 'express';
import {
  runAgentGoal,
  listAgentRuns,
  getAgentRun,
  getAgentSettings,
  updateAgentSettings,
  listAgentMemories,
  listAgentTools,
  createCopilotPlan,
  getCopilotPlan,
  listCopilotPlans,
  testCopilotPlan,
  editCopilotPlan,
  activateCopilotPlan,
  cancelCopilotPlan,
} from '../controllers/agent.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePlanGuard } from '../middleware/planLimits.js';

const router = Router();

router.use(requireAuth);

router.post('/run', requirePlanGuard('autonomy_level'), runAgentGoal);
router.get('/runs', listAgentRuns);
router.get('/runs/:id', getAgentRun);
router.get('/settings', getAgentSettings);
router.put('/settings', updateAgentSettings);
router.get('/memories', listAgentMemories);
router.get('/tools', listAgentTools);

// AI Automation Copilot Endpoints
router.post('/copilot/automation', createCopilotPlan);
router.get('/copilot/automations', listCopilotPlans);
router.get('/copilot/automation/:planId', getCopilotPlan);
router.post('/copilot/automation/:planId/test', testCopilotPlan);
router.put('/copilot/automation/:planId', editCopilotPlan);
router.post('/copilot/automation/:planId/activate', activateCopilotPlan);
router.post('/copilot/automation/:planId/cancel', cancelCopilotPlan);

export default router;
