import type { Request, Response } from 'express';
import { eventMeshService } from '../services/superadmin/eventMesh.service.js';

export class EventMeshController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await eventMeshService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listTopics(req: Request, res: Response): Promise<void> {
    try {
      const topics = await eventMeshService.getTopics();
      res.json({ success: true, data: topics });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createTopic(req: Request, res: Response): Promise<void> {
    try {
      const { topic_name, partition_count, retention_hours, schema_validation } = req.body;
      if (!topic_name) {
        res.status(400).json({ success: false, error: 'topic_name is required' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const topic = await eventMeshService.createTopic(
        { topic_name, partition_count, retention_hours, schema_validation },
        operatorUserId
      );
      res.status(201).json({ success: true, data: topic });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const { topicId } = req.query;
      const subscriptions = await eventMeshService.getSubscriptions(topicId as string);
      res.json({ success: true, data: subscriptions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateCircuitBreaker(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { circuit_breaker_status } = req.body;
      if (!circuit_breaker_status) {
        res.status(400).json({ success: false, error: 'circuit_breaker_status is required' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const subscription = await eventMeshService.updateCircuitBreaker(
        id,
        circuit_breaker_status,
        operatorUserId
      );
      res.json({ success: true, data: subscription });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listDlq(req: Request, res: Response): Promise<void> {
    try {
      const { status, topic_name, limit } = req.query;
      const dlq = await eventMeshService.getDlqMessages({
        status: status as string,
        topic_name: topic_name as string,
        limit: limit ? Number(limit) : undefined,
      });
      res.json({ success: true, data: dlq });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async replayDlq(req: Request, res: Response): Promise<void> {
    try {
      const { dlq_ids, target_endpoint, reset_circuit_breaker } = req.body;
      if (!dlq_ids || !Array.isArray(dlq_ids)) {
        res.status(400).json({ success: false, error: 'dlq_ids array is required' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await eventMeshService.replayDlqMessages(
        { dlq_ids, target_endpoint, reset_circuit_breaker },
        operatorUserId
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async discardDlq(req: Request, res: Response): Promise<void> {
    try {
      const { dlq_ids, reason } = req.body;
      if (!dlq_ids || !Array.isArray(dlq_ids)) {
        res.status(400).json({ success: false, error: 'dlq_ids array is required' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await eventMeshService.discardDlqMessages(
        { dlq_ids, reason: reason || 'Discarded by superadmin operator' },
        operatorUserId
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listIdempotencyKeys(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      const keys = await eventMeshService.getIdempotencyKeys(limit ? Number(limit) : 50);
      res.json({ success: true, data: keys });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async simulateEvent(req: Request, res: Response): Promise<void> {
    try {
      const { topic_name, payload, idempotency_key, fail_target_subscription } = req.body;
      if (!topic_name || !payload) {
        res.status(400).json({ success: false, error: 'topic_name and payload are required' });
        return;
      }
      const operatorUserId = (req as any).user?.userId || (req as any).user?.id;
      const result = await eventMeshService.simulateEvent(
        { topic_name, payload, idempotency_key, fail_target_subscription },
        operatorUserId
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const eventMeshController = new EventMeshController();
