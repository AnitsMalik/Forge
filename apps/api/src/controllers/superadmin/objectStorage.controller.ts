/**
 * Enterprise Multi-Cloud Distributed Object Storage Tiering, Immutable Object Lock & Presigned Upload Gateway Controller
 * SocialForge Platform v6.3.0
 */

import type { Request, Response } from 'express';
import { objectStorageService } from '../../services/superadmin/objectStorage.service.js';

export class ObjectStorageController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await objectStorageService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listBuckets(req: Request, res: Response): Promise<void> {
    try {
      const buckets = await objectStorageService.getBuckets();
      res.json({ success: true, data: buckets });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createBucket(req: Request, res: Response): Promise<void> {
    try {
      const { bucket_name, provider_type, region, endpoint_url, default_storage_class, versioning_enabled, is_immutable_locked } = req.body;
      if (!bucket_name || !provider_type || !region) {
        res.status(400).json({ success: false, error: 'bucket_name, provider_type, and region are required' });
        return;
      }

      const bucket = await objectStorageService.createBucket({
        bucket_name,
        provider_type,
        region,
        endpoint_url,
        default_storage_class,
        versioning_enabled,
        is_immutable_locked,
      });

      res.status(201).json({ success: true, data: bucket });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listLifecycleRules(req: Request, res: Response): Promise<void> {
    try {
      const { bucket_id } = req.query;
      const rules = await objectStorageService.getLifecycleRules(bucket_id as string | undefined);
      res.json({ success: true, data: rules });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createLifecycleRule(req: Request, res: Response): Promise<void> {
    try {
      const { bucket_id, rule_name, prefix_filter, transition_cool_days, transition_archive_days, expiration_days, noncurrent_version_expiration_days, is_active } = req.body;
      if (!bucket_id || !rule_name || transition_cool_days === undefined || transition_archive_days === undefined) {
        res.status(400).json({ success: false, error: 'bucket_id, rule_name, transition_cool_days, and transition_archive_days are required' });
        return;
      }

      const rule = await objectStorageService.createLifecycleRule({
        bucket_id,
        rule_name,
        prefix_filter,
        transition_cool_days: Number(transition_cool_days),
        transition_archive_days: Number(transition_archive_days),
        expiration_days: expiration_days !== undefined ? Number(expiration_days) : undefined,
        noncurrent_version_expiration_days: noncurrent_version_expiration_days !== undefined ? Number(noncurrent_version_expiration_days) : undefined,
        is_active,
      });

      res.status(201).json({ success: true, data: rule });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listObjectLocks(req: Request, res: Response): Promise<void> {
    try {
      const { bucket_id } = req.query;
      const locks = await objectStorageService.getObjectLocks(bucket_id as string | undefined);
      res.json({ success: true, data: locks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createObjectLock(req: Request, res: Response): Promise<void> {
    try {
      const { bucket_id, object_key, lock_mode, retention_days, legal_hold_active, sha256_checksum, locked_by_email } = req.body;
      if (!bucket_id || !object_key || !sha256_checksum) {
        res.status(400).json({ success: false, error: 'bucket_id, object_key, and sha256_checksum are required' });
        return;
      }

      const operatorEmail = (req as any).user?.email || 'security.lead@socialforge.io';
      const lock = await objectStorageService.createObjectLock(
        { bucket_id, object_key, lock_mode, retention_days, legal_hold_active, sha256_checksum, locked_by_email },
        operatorEmail
      );

      res.status(201).json({ success: true, data: lock });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteObject(req: Request, res: Response): Promise<void> {
    try {
      const { bucket_id, object_key } = req.body;
      if (!bucket_id || !object_key) {
        res.status(400).json({ success: false, error: 'bucket_id and object_key are required' });
        return;
      }

      const result = await objectStorageService.deleteObject(bucket_id, object_key);
      res.json({ success: true, data: result });
    } catch (err: any) {
      const statusCode = err.statusCode || 500;
      res.status(statusCode).json({ success: false, error: err.message });
    }
  }

  async generatePresignedUpload(req: Request, res: Response): Promise<void> {
    try {
      const { bucket_id, object_key, content_type, expected_sha256, expiration_seconds } = req.body;
      if (!bucket_id || !object_key || !content_type) {
        res.status(400).json({ success: false, error: 'bucket_id, object_key, and content_type are required' });
        return;
      }

      const session = await objectStorageService.generatePresignedUpload({
        bucket_id,
        object_key,
        content_type,
        expected_sha256,
        expiration_seconds: expiration_seconds ? Number(expiration_seconds) : undefined,
      });

      res.status(201).json({ success: true, data: session });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listPresignedSessions(req: Request, res: Response): Promise<void> {
    try {
      const { bucket_id } = req.query;
      const sessions = await objectStorageService.getPresignedSessions(bucket_id as string | undefined);
      res.json({ success: true, data: sessions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async verifyUploadedObject(req: Request, res: Response): Promise<void> {
    try {
      const { session_id, actual_sha256, actual_size_bytes } = req.body;
      if (!session_id || !actual_sha256) {
        res.status(400).json({ success: false, error: 'session_id and actual_sha256 are required' });
        return;
      }

      const result = await objectStorageService.verifyUploadedObject({
        session_id,
        actual_sha256,
        actual_size_bytes: Number(actual_size_bytes) || 1048576,
      });

      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async simulateTiering(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = await objectStorageService.simulateTieringTransition(id);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const objectStorageController = new ObjectStorageController();
