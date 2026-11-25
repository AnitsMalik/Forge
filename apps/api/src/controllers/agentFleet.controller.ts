/**
 * AI Agent Fleet Orchestration & Collaborative Multi-Agent Workflows Controller
 * SocialForge Platform v4.7.0
 */

import { Request, Response, NextFunction } from 'express';
import { agentFleetService, AgentFleetError } from '../services/superadmin/agentFleet.service.js';

function actorOf(req: Request) {
  return {
    id: req.user?.userId || 'unknown-operator',
    email: req.user?.email || 'superadmin@socialforge.ai',
  };
}

function handle(res: Response, next: NextFunction, err: any, fallbackStatus = 400) {
  if (err instanceof AgentFleetError) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  if (fallbackStatus >= 500) return next(err);
  return res.status(fallbackStatus).json({ success: false, error: err?.message || 'Request failed' });
}

export class AgentFleetController {
  async getTelemetry(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await agentFleetService.getTelemetry();
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  // ---------------------------------------------------------------------------
  // Agent Catalog
  // ---------------------------------------------------------------------------

  async listAgents(req: Request, res: Response, next: NextFunction) {
    try {
      const { role, status, tenantId, search, page, limit } = req.query;
      const data = await agentFleetService.listAgents({
        role: role as string | undefined,
        status: status as string | undefined,
        tenantId: tenantId as string | undefined,
        search: search as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getAgentById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await agentFleetService.getAgentById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async createAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await agentFleetService.createAgent(req.body, actorOf(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async updateAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await agentFleetService.updateAgent(req.params.id, req.body, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async deleteAgent(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await agentFleetService.deleteAgent(req.params.id, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Workflow DAG Pipelines
  // ---------------------------------------------------------------------------

  async listWorkflows(req: Request, res: Response, next: NextFunction) {
    try {
      const { tenantId, status, search, page, limit } = req.query;
      const data = await agentFleetService.listWorkflows({
        tenantId: tenantId as string | undefined,
        status: status as string | undefined,
        search: search as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getWorkflowById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await agentFleetService.getWorkflowById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async createWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await agentFleetService.createWorkflow(req.body, actorOf(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async updateWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await agentFleetService.updateWorkflow(req.params.id, req.body, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async deleteWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await agentFleetService.deleteWorkflow(req.params.id, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  // ---------------------------------------------------------------------------
  // Executions & Step Traces
  // ---------------------------------------------------------------------------

  async dispatchExecution(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await agentFleetService.dispatchWorkflowExecution(req.body, actorOf(req));
      res.status(201).json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async listExecutions(req: Request, res: Response, next: NextFunction) {
    try {
      const { workflowId, tenantId, status, page, limit } = req.query;
      const data = await agentFleetService.listExecutions({
        workflowId: workflowId as string | undefined,
        tenantId: tenantId as string | undefined,
        status: status as string | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getExecutionById(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await agentFleetService.getExecutionById(req.params.id);
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async abortExecution(req: Request, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body || {};
      const data = await agentFleetService.abortExecution(req.params.id, reason, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async critiqueStep(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await agentFleetService.critiqueStep(req.params.stepId, req.body, actorOf(req));
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err);
    }
  }
}

export const agentFleetController = new AgentFleetController();
