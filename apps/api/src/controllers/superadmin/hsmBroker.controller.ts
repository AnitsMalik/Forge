/**
 * Enterprise Cryptographic Hardware Security Module (HSM) Key Brokerage, Envelope Encryption & Vault Broker Controller
 * SocialForge Platform v6.2.0
 */

import type { Request, Response } from 'express';
import { hsmBrokerService } from '../../services/superadmin/hsmBroker.service.js';

export class HsmBrokerController {
  async getTelemetry(req: Request, res: Response): Promise<void> {
    try {
      const telemetry = await hsmBrokerService.getTelemetry();
      res.json({ success: true, data: telemetry });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listKeyRings(req: Request, res: Response): Promise<void> {
    try {
      const rings = await hsmBrokerService.getKeyRings();
      res.json({ success: true, data: rings });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async createKeyRing(req: Request, res: Response): Promise<void> {
    try {
      const { ring_name, provider_type, hsm_partition_id, master_key_alias, algorithm, rotation_interval_days } = req.body;
      if (!ring_name || !provider_type || !hsm_partition_id || !master_key_alias) {
        res.status(400).json({ success: false, error: 'ring_name, provider_type, hsm_partition_id, and master_key_alias are required' });
        return;
      }

      const operatorId = (req as any).user?.userId || (req as any).user?.id || 'sys-op';
      const operatorEmail = (req as any).user?.email || 'security.lead@socialforge.io';

      const ring = await hsmBrokerService.createKeyRing(
        { ring_name, provider_type, hsm_partition_id, master_key_alias, algorithm, rotation_interval_days },
        { id: operatorId, email: operatorEmail }
      );
      res.status(201).json({ success: true, data: ring });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listDeks(req: Request, res: Response): Promise<void> {
    try {
      const { key_ring_id, status } = req.query;
      const deks = await hsmBrokerService.getDeks(
        key_ring_id as string | undefined,
        status as string | undefined
      );
      res.json({ success: true, data: deks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async generateDek(req: Request, res: Response): Promise<void> {
    try {
      const { key_ring_id, key_label, intended_purpose, expires_in_days } = req.body;
      if (!key_ring_id || !key_label || !intended_purpose) {
        res.status(400).json({ success: false, error: 'key_ring_id, key_label, and intended_purpose are required' });
        return;
      }

      const operatorId = (req as any).user?.userId || (req as any).user?.id || 'sys-op';
      const operatorEmail = (req as any).user?.email || 'security.lead@socialforge.io';

      const dek = await hsmBrokerService.generateDek(
        { key_ring_id, key_label, intended_purpose, expires_in_days },
        { id: operatorId, email: operatorEmail }
      );
      res.status(201).json({ success: true, data: dek });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listPolicies(req: Request, res: Response): Promise<void> {
    try {
      const policies = await hsmBrokerService.getPolicies();
      res.json({ success: true, data: policies });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async listCryptoAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 50;
      const logs = await hsmBrokerService.getCryptoAuditLogs(limit);
      res.json({ success: true, data: logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async envelopeEncrypt(req: Request, res: Response): Promise<void> {
    try {
      const { dek_id, plaintext, additional_authenticated_data } = req.body;
      if (!dek_id || plaintext === undefined) {
        res.status(400).json({ success: false, error: 'dek_id and plaintext are required' });
        return;
      }

      const operatorId = (req as any).user?.userId || (req as any).user?.id || 'sys-op';
      const operatorEmail = (req as any).user?.email || 'security.lead@socialforge.io';

      const result = await hsmBrokerService.envelopeEncrypt(
        { dek_id, plaintext, additional_authenticated_data },
        { id: operatorId, email: operatorEmail }
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      const isShredded = err.message.includes('shredded');
      res.status(isShredded ? 409 : 500).json({ success: false, error: err.message });
    }
  }

  async envelopeDecrypt(req: Request, res: Response): Promise<void> {
    try {
      const { dek_id, ciphertext_base64, iv_base64, auth_tag_base64, additional_authenticated_data } = req.body;
      if (!dek_id || !ciphertext_base64 || !iv_base64 || !auth_tag_base64) {
        res.status(400).json({ success: false, error: 'dek_id, ciphertext_base64, iv_base64, and auth_tag_base64 are required' });
        return;
      }

      const operatorId = (req as any).user?.userId || (req as any).user?.id || 'sys-op';
      const operatorEmail = (req as any).user?.email || 'security.lead@socialforge.io';

      const result = await hsmBrokerService.envelopeDecrypt(
        { dek_id, ciphertext_base64, iv_base64, auth_tag_base64, additional_authenticated_data },
        { id: operatorId, email: operatorEmail }
      );
      res.json({ success: true, data: result });
    } catch (err: any) {
      const isShredded = err.message.includes('shredded');
      res.status(isShredded ? 410 : 500).json({ success: false, error: err.message });
    }
  }

  async rotateRootKek(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const operatorId = (req as any).user?.userId || (req as any).user?.id || 'sys-op';
      const operatorEmail = (req as any).user?.email || 'security.lead@socialforge.io';

      const result = await hsmBrokerService.rotateRootKek(id, { id: operatorId, email: operatorEmail });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  async cryptoShredDek(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason, confirmation } = req.body;
      if (!reason || confirmation !== true) {
        res.status(400).json({ success: false, error: 'reason and confirmation (true) are strictly required for crypto-shredding' });
        return;
      }

      const operatorId = (req as any).user?.userId || (req as any).user?.id || 'sys-op';
      const operatorEmail = (req as any).user?.email || 'security.lead@socialforge.io';

      const result = await hsmBrokerService.cryptoShredDek(id, { reason, confirmation }, { id: operatorId, email: operatorEmail });
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

export const hsmBrokerController = new HsmBrokerController();
