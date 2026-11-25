import { Request, Response } from 'express';
import {
  agentOrchestratorService,
  agentSettingsService,
  agentMemoryService,
  toolRegistryService,
} from '../services/agent/index.js';
import { copilotAutomationService } from '../services/automation/copilotAutomation.service.js';

type AuthenticatedRequest = Request;

/**
 * POST /api/agent/run
 * Executes an autonomous AI agent goal
 */
export async function runAgentGoal(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId || (req.body && req.body.tenantId);
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const { prompt, agentType = 'growth_manager', brandId, autonomousMode, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required to run agent goal.' });
    }

    const result = await agentOrchestratorService.runGoal(
      tenantId,
      {
        prompt,
        agentType,
        brandId,
        autonomousMode,
        context,
      },
      req.user?.id
    );

    if (result.status === 'failed' && result.error?.includes('violates')) {
      return res.status(422).json(result);
    }

    return res.json(result);
  } catch (err: any) {
    console.error('Error running agent goal:', err);
    return res.status(500).json({ error: 'Failed to run agent goal', details: err.message });
  }
}

/**
 * GET /api/agent/runs
 * Lists historical agent runs with multi-tenant isolation
 */
export async function listAgentRuns(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const brandId = (req.query.brandId as string) || (req.params.brandId as string);
    const runs = await agentOrchestratorService.listRuns(tenantId, brandId);
    return res.json({ runs });
  } catch (err: any) {
    console.error('Error listing agent runs:', err);
    return res.status(500).json({ error: 'Failed to list agent runs', details: err.message });
  }
}

/**
 * GET /api/agent/runs/:id
 * Retrieves a single agent run by ID
 */
export async function getAgentRun(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const run = await agentOrchestratorService.getRunById(tenantId, req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'Agent run not found or access denied.' });
    }

    return res.json({ run });
  } catch (err: any) {
    console.error('Error getting agent run:', err);
    return res.status(500).json({ error: 'Failed to get agent run', details: err.message });
  }
}

/**
 * GET /api/agent/settings
 * Retrieves agent settings for tenant & optional brand
 */
export async function getAgentSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const brandId = req.query.brandId as string;
    const settings = await agentSettingsService.getSettings(tenantId, brandId);
    return res.json({ settings });
  } catch (err: any) {
    console.error('Error retrieving agent settings:', err);
    return res.status(500).json({ error: 'Failed to get agent settings', details: err.message });
  }
}

/**
 * PUT /api/agent/settings
 * Updates agent settings for tenant & optional brand
 */
export async function updateAgentSettings(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const brandId = (req.query.brandId as string) || req.body.brandId;
    const settings = await agentSettingsService.updateSettings(tenantId, req.body, brandId);
    return res.json({ success: true, settings });
  } catch (err: any) {
    console.error('Error updating agent settings:', err);
    return res.status(500).json({ error: 'Failed to update agent settings', details: err.message });
  }
}

/**
 * GET /api/agent/memories
 * Lists memories for brand & tenant
 */
export async function listAgentMemories(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const memoryType = (req.query.type as any) || 'brand_guidelines';
    const brandId = req.query.brandId as string;
    const memories = await agentMemoryService.recallByType(tenantId, memoryType, brandId);
    return res.json({ memories });
  } catch (err: any) {
    console.error('Error listing memories:', err);
    return res.status(500).json({ error: 'Failed to list memories', details: err.message });
  }
}

/**
 * GET /api/agent/tools
 * Lists registered agent tools
 */
export async function listAgentTools(req: AuthenticatedRequest, res: Response) {
  try {
    const tools = toolRegistryService.listTools();
    return res.json({ tools });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to list agent tools' });
  }
}

/**
 * POST /api/agent/copilot/automation
 * POST /api/brands/:brandId/agent/copilot/automation
 */
export async function createCopilotPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id || 'system';
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const brandId = req.params.brandId || req.body.brandId;
    const prompt = req.body.prompt;
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required.' });
    }

    const plan = await copilotAutomationService.generateAutomationPlan(
      tenantId,
      brandId,
      userId,
      req.body
    );

    return res.status(201).json({ success: true, plan });
  } catch (err: any) {
    console.error('Error creating copilot plan:', err);
    return res.status(500).json({ error: 'Failed to create copilot plan', details: err.message });
  }
}

/**
 * GET /api/agent/copilot/automation/:planId
 */
export async function getCopilotPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const plan = await copilotAutomationService.getPlan(tenantId, req.params.planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found.' });
    }

    return res.json({ success: true, plan });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to get copilot plan', details: err.message });
  }
}

/**
 * GET /api/agent/copilot/automations
 * GET /api/brands/:brandId/agent/copilot/automations
 */
export async function listCopilotPlans(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const brandId = req.params.brandId || (req.query.brandId as string);
    const plans = await copilotAutomationService.listPlans(tenantId, brandId);
    return res.json({ success: true, plans, count: plans.length });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to list copilot plans', details: err.message });
  }
}

/**
 * POST /api/agent/copilot/automation/:planId/test
 */
export async function testCopilotPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const testResults = await copilotAutomationService.testPlan(tenantId, req.params.planId, req.body.samplePayload);
    return res.json({ success: true, testResults });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to test copilot plan', details: err.message });
  }
}

/**
 * PUT /api/agent/copilot/automation/:planId
 */
export async function editCopilotPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const plan = await copilotAutomationService.editPlan(tenantId, req.params.planId, req.body);
    return res.json({ success: true, plan });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to edit copilot plan', details: err.message });
  }
}

/**
 * POST /api/agent/copilot/automation/:planId/activate
 */
export async function activateCopilotPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id || 'system';
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const result = await copilotAutomationService.activatePlan(tenantId, req.params.planId);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to activate copilot plan', details: err.message });
  }
}

/**
 * POST /api/agent/copilot/automation/:planId/cancel
 */
export async function cancelCopilotPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ error: 'Tenant context required.' });
    }

    const plan = await copilotAutomationService.cancelPlan(tenantId, req.params.planId, req.body?.reason);
    return res.json({ success: true, plan });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to cancel copilot plan', details: err.message });
  }
}
