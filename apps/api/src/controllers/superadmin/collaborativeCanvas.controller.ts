/**
 * Multi-Tenant Real-Time Collaborative Canvas, Operational Transformation (OT/CRDT) & Presence Gateway Controller
 * SocialForge Platform v6.5.0
 */

import type { Request, Response } from 'express';
import { collaborativeCanvasService } from '../../services/superadmin/collaborativeCanvas.service.js';

export class CollaborativeCanvasController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await collaborativeCanvasService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listRooms(req: Request, res: Response): Promise<void> {
    try {
      const rooms = await collaborativeCanvasService.getRooms();
      res.json({ success: true, data: rooms });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createRoom(req: Request, res: Response): Promise<void> {
    try {
      const { room_name, target_brand_id, template_id, initial_elements } = req.body;
      if (!room_name || !target_brand_id) {
        res.status(400).json({ success: false, error: 'room_name and target_brand_id are required' });
        return;
      }

      const room = await collaborativeCanvasService.createRoom({
        room_name,
        target_brand_id,
        template_id,
        initial_elements,
      });

      res.status(201).json({ success: true, data: room });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getRoomState(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'Room id is required' });
        return;
      }

      const state = await collaborativeCanvasService.getRoomState(id);
      res.json({ success: true, data: state });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async applyOp(req: Request, res: Response): Promise<void> {
    try {
      const { room_id, client_id, op_type, target_layer_id, base_revision, payload } = req.body;
      if (!room_id || !client_id || !op_type || !target_layer_id || base_revision === undefined || !payload) {
        res.status(400).json({
          success: false,
          error: 'room_id, client_id, op_type, target_layer_id, base_revision, and payload are required',
        });
        return;
      }

      const result = await collaborativeCanvasService.applyOp({
        room_id,
        client_id,
        op_type,
        target_layer_id,
        base_revision: Number(base_revision),
        payload,
      });

      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      if (err.message.includes('locked')) {
        res.status(423).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updatePresence(req: Request, res: Response): Promise<void> {
    try {
      const { room_id, cursor_position_x, cursor_position_y, current_selected_layer_id } = req.body;
      if (!room_id || cursor_position_x === undefined || cursor_position_y === undefined) {
        res.status(400).json({
          success: false,
          error: 'room_id, cursor_position_x, and cursor_position_y are required',
        });
        return;
      }

      const user = (req as any).user;
      const userId = user?.userId || 'usr-superadmin';
      const userEmail = user?.email || 'admin@socialforge.io';
      const displayName = user?.displayName || user?.name || userEmail.split('@')[0];

      const result = await collaborativeCanvasService.updatePresence(
        {
          room_id,
          cursor_position_x: Number(cursor_position_x),
          cursor_position_y: Number(cursor_position_y),
          current_selected_layer_id,
        },
        userId,
        userEmail,
        displayName
      );

      res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getPresence(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      if (!roomId) {
        res.status(400).json({ success: false, error: 'roomId parameter is required' });
        return;
      }

      const presence = await collaborativeCanvasService.getPresence(roomId);
      res.json({ success: true, data: presence });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getOps(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const { limit } = req.query;
      if (!roomId) {
        res.status(400).json({ success: false, error: 'roomId parameter is required' });
        return;
      }

      const ops = await collaborativeCanvasService.getOps(
        roomId,
        limit !== undefined ? Number(limit) : 50
      );
      res.json({ success: true, data: ops });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const collaborativeCanvasController = new CollaborativeCanvasController();
