import type { Request, Response } from 'express';
import { planGuardService, PlanGuardError } from '../services/billing/planGuard.service.js';
import {
  automationService,
  automationRunnerService,
  durableRunnerService,
  triggerService,
  recipeService,
  automationHealthService,
  durableStepLoggerService,
  retryDlqService,
  sanitizeSecrets,
} from '../services/automation/index.js';

export async function listAutomations(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const brandId = (req.query.brandId as string) || (req.params.brandId as string);
    const status = req.query.status as string;
    const triggerType = req.query.triggerType as string;

    const automations = await automationService.listAutomations(tenantId, {
      brandId,
      status,
      triggerType,
    });

    return res.json({ success: true, data: automations, automations });
  } catch (err: any) {
    console.error('[Automation Controller] Error listing automations:', err);
    return res.status(500).json({ error: 'Failed to list automations', details: err.message });
  }
}

export async function getAutomation(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const automation = await automationService.getAutomationById(tenantId, id);
    if (!automation) {
      return res.status(404).json({ error: 'Automation not found or access denied.' });
    }

    return res.json({ success: true, data: automation, automation });
  } catch (err: any) {
    console.error('[Automation Controller] Error retrieving automation:', err);
    return res.status(500).json({ error: 'Failed to get automation', details: err.message });
  }
}

export async function createAutomation(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user?.userId || req.user?.id;
    const brandId = req.body.brandId || req.body.brand_id || req.params.brandId;
    const name = req.body.name;
    const description = req.body.description;
    const triggerType = req.body.triggerType || req.body.trigger_type;
    const triggerConfig = req.body.triggerConfig || req.body.trigger_config || {};
    const conditions = req.body.conditions;
    const actions =
      req.body.actions ||
      (req.body.action_config?.steps
        ? req.body.action_config.steps
        : req.body.action_type
        ? [{ type: req.body.action_type, label: req.body.action_type }]
        : [{ type: 'execute_pipeline', label: 'Pipeline Action' }]);
    const recipeId = req.body.recipeId || req.body.recipe_id;
    const status = req.body.status || 'active';

    if (!brandId || !name || !triggerType || !actions) {
      return res.status(400).json({ error: 'brandId, name, triggerType, and actions are required.' });
    }

    // Enforce tier quota on active automations (Starter: 3, Growth: 10, Agency Pro: 50, Scale: 200)
    if (status === 'active') {
      try {
        await planGuardService.enforce(tenantId, 'active_automations', 1);
      } catch (guardErr: any) {
        if (guardErr instanceof PlanGuardError) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'PLAN_LIMIT_EXCEEDED',
              message: guardErr.message,
              checkResult: guardErr.checkResult,
            },
          });
        }
        throw guardErr;
      }
    }

    const automation = await automationService.createAutomation(tenantId, {
      brandId,
      name,
      description,
      triggerType,
      triggerConfig,
      conditions,
      actions,
      recipeId,
      status,
      userId,
    });

    return res.status(201).json({ success: true, data: automation, automation });
  } catch (err: any) {
    console.error('[Automation Controller] Error creating automation:', err);
    if (err instanceof PlanGuardError) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_LIMIT_EXCEEDED',
          message: err.message,
          checkResult: err.checkResult,
        },
      });
    }
    const statusCode = err.message.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({ error: 'Failed to create automation', details: err.message });
  }
}

export async function updateAutomation(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { name, description, status, triggerConfig, conditions, actions } = req.body;

    // If activating an inactive/paused automation, check quota
    if (status === 'active') {
      const existing = await automationService.getAutomationById(tenantId, id);
      if (existing && existing.status !== 'active') {
        try {
          await planGuardService.enforce(tenantId, 'active_automations', 1);
        } catch (guardErr: any) {
          if (guardErr instanceof PlanGuardError) {
            return res.status(403).json({
              success: false,
              error: {
                code: 'PLAN_LIMIT_EXCEEDED',
                message: guardErr.message,
                checkResult: guardErr.checkResult,
              },
            });
          }
          throw guardErr;
        }
      }
    }

    const automation = await automationService.updateAutomation(tenantId, id, {
      name,
      description,
      status,
      triggerConfig,
      conditions,
      actions,
    });

    return res.json({ success: true, data: automation, automation });
  } catch (err: any) {
    console.error('[Automation Controller] Error updating automation:', err);
    const statusCode = err.message.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({ error: 'Failed to update automation', details: err.message });
  }
}

export async function deleteAutomation(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const deleted = await automationService.deleteAutomation(tenantId, id);
    if (!deleted) {
      return res.status(404).json({ error: 'Automation not found or access denied.' });
    }

    return res.json({ success: true, message: 'Automation deleted successfully.' });
  } catch (err: any) {
    console.error('[Automation Controller] Error deleting automation:', err);
    const statusCode = err.message.includes('not found') ? 404 : 500;
    return res.status(statusCode).json({ error: 'Failed to delete automation', details: err.message });
  }
}

export async function pauseAutomation(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const success = await durableRunnerService.pauseAutomation(tenantId, id);
    if (!success) {
      return res.status(404).json({ error: 'Automation not found or access denied.' });
    }

    return res.json({ success: true, message: 'Automation paused successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to pause automation', details: err.message });
  }
}

export async function resumeAutomation(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const success = await durableRunnerService.resumeAutomation(tenantId, id);
    if (!success) {
      return res.status(404).json({ error: 'Automation not found or access denied.' });
    }

    return res.json({ success: true, message: 'Automation resumed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to resume automation', details: err.message });
  }
}

export async function cancelAutomation(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { reason } = req.body;

    const success = await durableRunnerService.cancelAutomation(tenantId, id, reason);
    if (!success) {
      return res.status(404).json({ error: 'Automation not found or access denied.' });
    }

    return res.json({ success: true, message: 'Automation cancelled successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to cancel automation', details: err.message });
  }
}

export async function cancelRun(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { runId } = req.params;
    const { reason } = req.body;

    const success = await durableRunnerService.cancelRun(tenantId, runId, reason);
    if (!success) {
      return res.status(404).json({ error: 'Run not found or already in terminal state.' });
    }

    return res.json({ success: true, message: 'Automation run cancelled successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to cancel run', details: err.message });
  }
}

export async function triggerAutomation(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const payloadOverride = req.body.payloadOverride || req.body.triggerEvent;

    const result = await automationRunnerService.executeAutomation(tenantId, id, payloadOverride);

    return res.json({
      success: result.success,
      runId: result.runId,
      status: result.status,
      durationMs: result.durationMs,
      stepResults: result.stepResults,
      skipped: result.skipped,
      reason: result.reason,
      error: result.error,
    });
  } catch (err: any) {
    console.error('[Automation Controller] Error triggering automation:', err);
    const statusCode = err.message.includes('not found') ? 404 : 500;
    return res.status(statusCode).json({ error: 'Failed to trigger automation', details: err.message });
  }
}

export async function triggerDurableRun(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { triggerEvent, sourceConnectionId, sourceRecordId, sourceVersion, actionType, templateVersion, runContext } = req.body;

    const result = await durableRunnerService.executeDurableRun({
      tenantId,
      automationId: id,
      triggerEvent: triggerEvent || {},
      sourceConnectionId,
      sourceRecordId,
      sourceVersion,
      actionType,
      templateVersion,
      runContext,
    });

    return res.json({
      success: result.success,
      runId: result.runId,
      lifecycleState: result.lifecycleState,
      status: result.status,
      durationMs: result.durationMs,
      stepResults: result.stepResults,
      retrying: result.retrying,
      retryCount: result.retryCount,
      nextRetryAt: result.nextRetryAt,
      dlqId: result.dlqId,
      reason: result.reason,
      error: result.error,
    });
  } catch (err: any) {
    console.error('[Automation Controller] Error triggering durable run:', err);
    const statusCode = err.message.includes('not found') ? 404 : 500;
    return res.status(statusCode).json({ error: 'Failed to trigger durable run', details: err.message });
  }
}

export async function listRunSteps(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { runId } = req.params;

    const steps = await durableStepLoggerService.listStepRuns(runId, tenantId);
    return res.json({ steps: sanitizeSecrets(steps) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to list step runs', details: err.message });
  }
}

export async function listDlqItems(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const brandId = req.query.brandId as string;
    const status = req.query.status as string;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const items = await retryDlqService.listDlq(tenantId, { brandId, status, limit });
    return res.json({ dlq: items });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to list DLQ records', details: err.message });
  }
}

export async function replayDlqItem(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const result = await retryDlqService.replayDlq(id, tenantId);
    return res.json({ success: result.success, runId: result.runId, message: 'DLQ item replayed successfully.' });
  } catch (err: any) {
    const statusCode = err.message.includes('not found') ? 404 : 500;
    return res.status(statusCode).json({ error: 'Failed to replay DLQ item', details: err.message });
  }
}

export async function discardDlqItem(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const success = await retryDlqService.discardDlq(id, tenantId);
    return res.json({ success, message: 'DLQ item discarded.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to discard DLQ item', details: err.message });
  }
}

export async function dispatchTrigger(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { triggerType, payload } = req.body;

    if (!triggerType) {
      return res.status(400).json({ error: 'triggerType is required.' });
    }

    const results = await triggerService.dispatchTrigger(tenantId, triggerType, payload || {});
    return res.json({ success: true, count: results.length, results });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to dispatch trigger', details: err.message });
  }
}

export async function handleInboundWebhook(req: Request, res: Response) {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ error: 'Webhook token is required.' });
    }

    const result = await triggerService.handleWebhookTrigger(token, req.body);

    return res.json({
      success: result.success,
      runId: result.runId,
      status: result.status,
      durationMs: result.durationMs,
      message: 'Inbound webhook processed successfully.',
    });
  } catch (err: any) {
    console.error('[Automation Controller] Webhook error:', err);
    const statusCode = err.message.includes('No active automation') ? 404 : 500;
    return res.status(statusCode).json({ error: 'Failed to process webhook', details: err.message });
  }
}

export async function listAutomationRuns(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const automationId = id || (req.query.automationId as string);
    const brandId = req.query.brandId as string;
    const status = req.query.status as string;
    const triggerType = req.query.triggerType as string;
    const search = req.query.search as string;
    const dateFrom = req.query.dateFrom as string;
    const dateTo = req.query.dateTo as string;
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const offset = req.query.offset ? Number(req.query.offset) : 0;

    const runs = await automationService.listRuns(tenantId, {
      automationId,
      brandId,
      status,
      triggerType,
      search,
      dateFrom,
      dateTo,
      limit,
      offset,
    });

    return res.json({ success: true, data: runs, runs });
  } catch (err: any) {
    console.error('[Automation Controller] Error listing runs:', err);
    return res.status(500).json({ error: 'Failed to list automation runs', details: err.message });
  }
}

export async function listRecipes(_req: Request, res: Response) {
  try {
    const recipes = recipeService.listRecipes();
    return res.json({ success: true, data: recipes, recipes });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to list recipes', details: err.message });
  }
}

export async function instantiateRecipe(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user?.userId || req.user?.id;
    const { recipeId } = req.params;
    const { brandId, customName } = req.body;

    if (!brandId) {
      return res.status(400).json({ error: 'brandId is required to instantiate a recipe.' });
    }

    const automation = await recipeService.instantiateRecipe(
      tenantId,
      brandId,
      recipeId,
      customName,
      userId
    );

    return res.status(201).json({ success: true, data: automation, automation });
  } catch (err: any) {
    console.error('[Automation Controller] Error instantiating recipe:', err);
    const statusCode = err.message.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({ error: 'Failed to instantiate recipe', details: err.message });
  }
}

export async function getAutomationHealth(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const brandId = req.query.brandId as string;

    const health = await automationHealthService.getHealthSummary(tenantId, brandId);
    return res.json({ success: true, data: health, health });
  } catch (err: any) {
    console.error('[Automation Controller] Error getting health:', err);
    return res.status(500).json({ error: 'Failed to get automation health', details: err.message });
  }
}

export async function getAutomationMetrics(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const brandId = req.query.brandId as string;

    const metrics = await automationHealthService.getAutomationMetrics(tenantId, brandId);
    return res.json({ success: true, data: metrics, metrics });
  } catch (err: any) {
    console.error('[Automation Controller] Error getting automation metrics:', err);
    return res.status(500).json({ error: 'Failed to get automation metrics', details: err.message });
  }
}

export async function approveRun(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const reviewerId = req.user?.userId || req.user?.id;
    const { runId } = req.params;
    const { notes } = req.body || {};

    const result = await durableRunnerService.approveAndResumeRun({
      tenantId,
      runId,
      reviewerId,
      notes,
    });

    return res.json({
      success: result.success,
      runId: result.runId,
      lifecycleState: result.lifecycleState,
      status: result.status,
      durationMs: result.durationMs,
      message: 'Run approved and resumed successfully.',
      stepResults: result.stepResults,
    });
  } catch (err: any) {
    console.error('[Automation Controller] Error approving run:', err);
    const statusCode = err.message.includes('not found') ? 404 : 400;
    return res.status(statusCode).json({ error: 'Failed to approve run', details: err.message });
  }
}

export async function reconcileStalledRuns(req: Request, res: Response) {
  try {
    const tenantId = req.user!.tenantId;
    const result = await durableRunnerService.reconcileStalledRuns(tenantId);
    return res.json({ success: true, data: result, ...result });
  } catch (err: any) {
    console.error('[Automation Controller] Error reconciling runs:', err);
    return res.status(500).json({ error: 'Failed to reconcile stalled runs', details: err.message });
  }
}

