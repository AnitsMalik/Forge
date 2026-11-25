/**
 * Enterprise Distributed Workflow Engine, State Machine Orchestration & Long-Running Saga Coordinator Controller
 * SocialForge Platform v6.7.0
 */

import type { Request, Response } from 'express';
import { sagaWorkflowService } from '../../services/superadmin/sagaWorkflow.service.js';

export class SagaWorkflowController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await sagaWorkflowService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listDefinitions(req: Request, res: Response): Promise<void> {
    try {
      const definitions = await sagaWorkflowService.getDefinitions();
      res.json({ success: true, data: definitions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { workflow_name, workflow_type, description, failure_strategy, steps_configuration } = req.body;
      if (!workflow_name || !workflow_type || !description) {
        res.status(400).json({
          success: false,
          error: 'workflow_name, workflow_type, and description are required',
        });
        return;
      }

      const definition = await sagaWorkflowService.createDefinition({
        workflow_name,
        workflow_type,
        description,
        failure_strategy,
        steps_configuration: steps_configuration || [],
      });

      res.status(201).json({ success: true, data: definition });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteDefinition(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'Definition id is required' });
        return;
      }
      const deleted = await sagaWorkflowService.deleteDefinition(id);
      res.json({ success: true, data: { deleted } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listInstances(req: Request, res: Response): Promise<void> {
    try {
      const { status, limit } = req.query;
      const instances = await sagaWorkflowService.getInstances(
        status as string | undefined,
        limit ? Number(limit) : undefined
      );
      res.json({ success: true, data: instances });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getInstanceDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'Instance id is required' });
        return;
      }

      const detail = await sagaWorkflowService.getInstanceDetail(id);
      if (!detail) {
        res.status(404).json({ success: false, error: `Instance ${id} not found` });
        return;
      }

      res.json({ success: true, data: detail });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async triggerInstance(req: Request, res: Response): Promise<void> {
    try {
      const { workflow_definition_id, target_tenant_id, correlation_id, input_payload } = req.body;
      if (!workflow_definition_id || !target_tenant_id) {
        res.status(400).json({
          success: false,
          error: 'workflow_definition_id and target_tenant_id are required',
        });
        return;
      }

      const result = await sagaWorkflowService.triggerInstance({
        workflow_definition_id,
        target_tenant_id,
        correlation_id,
        input_payload,
      });

      res.status(201).json({ success: true, data: result });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async executeStep(req: Request, res: Response): Promise<void> {
    try {
      const { id, stepIndex } = req.params;
      const { outcome, output_payload, error_message } = req.body;

      if (!id || stepIndex === undefined || !outcome) {
        res.status(400).json({
          success: false,
          error: 'id, stepIndex, and outcome (succeeded | failed) are required',
        });
        return;
      }

      if (outcome !== 'succeeded' && outcome !== 'failed') {
        res.status(400).json({
          success: false,
          error: "outcome must be 'succeeded' or 'failed'",
        });
        return;
      }

      const result = await sagaWorkflowService.executeStep(
        id,
        Number(stepIndex),
        outcome,
        output_payload || {},
        error_message
      );

      res.json({ success: true, data: result });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async triggerCompensation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id || !reason) {
        res.status(400).json({
          success: false,
          error: 'id and reason are required',
        });
        return;
      }

      const result = await sagaWorkflowService.triggerCompensation(id, reason);
      res.json({ success: true, data: result });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async resumeInstance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { resume_step_index } = req.body;

      if (!id) {
        res.status(400).json({ success: false, error: 'id is required' });
        return;
      }

      const result = await sagaWorkflowService.resumeInstance(
        id,
        resume_step_index !== undefined ? Number(resume_step_index) : undefined
      );

      res.json({ success: true, data: result });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteInstance(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'id is required' });
        return;
      }

      const deleted = await sagaWorkflowService.deleteInstance(id);
      res.json({ success: true, data: { deleted } });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const sagaWorkflowController = new SagaWorkflowController();
