/**
 * Multi-Tenant Real-Time Video Rendering Pipeline, Dynamic Motion Graphics & Cloud GPU Transcoding Mesh Controller
 * SocialForge Platform v6.6.0
 */

import type { Request, Response } from 'express';
import { videoRenderingService } from '../../services/superadmin/videoRendering.service.js';

export class VideoRenderingController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await videoRenderingService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listJobs(req: Request, res: Response): Promise<void> {
    try {
      const { brand_id, status } = req.query;
      const jobs = await videoRenderingService.getJobs(
        brand_id as string | undefined,
        status as string | undefined
      );
      res.json({ success: true, data: jobs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async getJobById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'Job id is required' });
        return;
      }

      const result = await videoRenderingService.getJobById(id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createJob(req: Request, res: Response): Promise<void> {
    try {
      const { job_name, target_brand_id, template_id, aspect_ratio, fps, duration_seconds, codec, preferred_gpu_node_id } = req.body;
      if (!job_name || !target_brand_id || !aspect_ratio) {
        res.status(400).json({
          success: false,
          error: 'job_name, target_brand_id, and aspect_ratio are required',
        });
        return;
      }

      const job = await videoRenderingService.createJob({
        job_name,
        target_brand_id,
        template_id,
        aspect_ratio,
        fps: fps ? Number(fps) : undefined,
        duration_seconds: duration_seconds ? Number(duration_seconds) : undefined,
        codec,
        preferred_gpu_node_id,
      });

      res.status(201).json({ success: true, data: job });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateJobProgress(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { progress_percent, status, output_asset_url, file_size_bytes, render_time_ms, error_message } = req.body;
      if (progress_percent === undefined) {
        res.status(400).json({ success: false, error: 'progress_percent is required' });
        return;
      }

      const updated = await videoRenderingService.updateJobProgress({
        job_id: id,
        progress_percent: Number(progress_percent),
        status,
        output_asset_url,
        file_size_bytes: file_size_bytes !== undefined ? Number(file_size_bytes) : undefined,
        render_time_ms: render_time_ms !== undefined ? Number(render_time_ms) : undefined,
        error_message,
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async cancelJob(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const cancelled = await videoRenderingService.cancelJob(id);
      res.json({ success: true, data: cancelled });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      if (err.message.includes('cannot be cancelled')) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { brand_id } = req.query;
      const templates = await videoRenderingService.getTemplates(brand_id as string | undefined);
      res.json({ success: true, data: templates });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { template_name, target_brand_id, default_aspect_ratio, duration_seconds, composition_layers } = req.body;
      if (!template_name || !target_brand_id || !default_aspect_ratio || duration_seconds === undefined) {
        res.status(400).json({
          success: false,
          error: 'template_name, target_brand_id, default_aspect_ratio, and duration_seconds are required',
        });
        return;
      }

      const template = await videoRenderingService.createTemplate({
        template_name,
        target_brand_id,
        default_aspect_ratio,
        duration_seconds: Number(duration_seconds),
        composition_layers,
      });

      res.status(201).json({ success: true, data: template });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listNodes(req: Request, res: Response): Promise<void> {
    try {
      const nodes = await videoRenderingService.getNodes();
      res.json({ success: true, data: nodes });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async registerNode(req: Request, res: Response): Promise<void> {
    try {
      const { node_name, provider, gpu_device_model, acceleration_type, total_vram_gb, max_concurrent_jobs } = req.body;
      if (!node_name || !provider || !gpu_device_model || !acceleration_type || total_vram_gb === undefined) {
        res.status(400).json({
          success: false,
          error: 'node_name, provider, gpu_device_model, acceleration_type, and total_vram_gb are required',
        });
        return;
      }

      const node = await videoRenderingService.registerNode({
        node_name,
        provider,
        gpu_device_model,
        acceleration_type,
        total_vram_gb: Number(total_vram_gb),
        max_concurrent_jobs: max_concurrent_jobs !== undefined ? Number(max_concurrent_jobs) : undefined,
      });

      res.status(201).json({ success: true, data: node });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const videoRenderingController = new VideoRenderingController();
