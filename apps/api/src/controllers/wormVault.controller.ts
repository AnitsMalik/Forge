/**
 * Immutable WORM Audit Vault & External Legal Verification Controller
 * SocialForge Platform v4.5.0
 */

import { Request, Response, NextFunction } from 'express';
import { wormVaultService, WormError } from '../services/superadmin/wormVault.service.js';
import { verifyInclusionProof } from '../services/superadmin/wormCrypto.js';

function actorOf(req: Request) {
  return {
    id: req.user?.userId || 'unknown-admin',
    email: req.user?.email || 'admin@socialforge.ai',
  };
}

function clientIp(req: Request): string | null {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length) return fwd.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

function handle(res: Response, next: NextFunction, err: any, fallbackStatus = 400) {
  if (err instanceof WormError) {
    return res.status(err.status).json({ success: false, error: err.message });
  }
  if (fallbackStatus >= 500) return next(err);
  return res.status(fallbackStatus).json({ success: false, error: err?.message || 'Request failed' });
}

export class WormVaultController {
  // ---------------------------------------------------------------------------
  // Superadmin endpoints (/api/v1/admin/operations/worm/*)
  // ---------------------------------------------------------------------------

  async getOverview(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await wormVaultService.getOverview() });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async ingest(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await wormVaultService.ingest({ limitPerSource: req.body?.limitPerSource, actor: actorOf(req) });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async listRecords(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await wormVaultService.listRecords({
        sourceTable: req.query.sourceTable as string | undefined,
        tenantId: req.query.tenantId as string | undefined,
        action: req.query.action as string | undefined,
        limit: Number(req.query.limit) || undefined,
        offset: Number(req.query.offset) || undefined,
      });
      res.json({ success: true, data });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async getRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const seq = Number(req.params.sequence);
      if (!Number.isInteger(seq) || seq < 1) return res.status(400).json({ success: false, error: 'Invalid sequence number.' });
      res.json({ success: true, data: await wormVaultService.getRecord(seq) });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async verifyLedger(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await wormVaultService.verifyLedger(actorOf(req)) });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async simulateTamper(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await wormVaultService.simulateTamper(req.body) });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async listSeals(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await wormVaultService.listSeals(Number(req.query.limit) || 100) });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async createSeal(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await wormVaultService.createSeal(actorOf(req)) });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async getSeal(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await wormVaultService.verifySeal(req.params.id) });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async getSigningKey(_req: Request, res: Response) {
    res.json({ success: true, data: wormVaultService.getSigningKeyInfo() });
  }

  async listLegalHolds(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await wormVaultService.listLegalHolds(req.query.status as string | undefined) });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async createLegalHold(req: Request, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await wormVaultService.createLegalHold(req.body, actorOf(req)) });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async releaseLegalHold(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await wormVaultService.releaseLegalHold(req.params.id, req.body, actorOf(req)) });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async listVerificationTokens(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await wormVaultService.listVerificationTokens() });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  async issueVerificationToken(req: Request, res: Response, next: NextFunction) {
    try {
      res.setHeader('Cache-Control', 'no-store');
      res.status(201).json({ success: true, data: await wormVaultService.issueVerificationToken(req.body, actorOf(req)) });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async revokeVerificationToken(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await wormVaultService.revokeVerificationToken(req.params.id, actorOf(req)) });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async listVerificationEvents(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await wormVaultService.listVerificationEvents(Number(req.query.limit) || 100) });
    } catch (err) {
      handle(res, next, err, 500);
    }
  }

  // ---------------------------------------------------------------------------
  // External legal verification portal (/api/v1/public/worm-verify/*)
  // Token-gated (X-Verification-Token); exposes hashes, proofs and seals — never payloads.
  // ---------------------------------------------------------------------------

  async publicKey(_req: Request, res: Response) {
    const { algorithm, keyId, publicKeyPem } = wormVaultService.getSigningKeyInfo();
    res.json({ success: true, data: { algorithm, keyId, publicKeyPem } });
  }

  private async gate(req: Request, endpoint: string): Promise<string> {
    return wormVaultService.authenticateVerificationToken(req.headers['x-verification-token'] as string | undefined, endpoint, clientIp(req));
  }

  async publicListSeals(req: Request, res: Response, next: NextFunction) {
    try {
      const tokenId = await this.gate(req, 'GET /seals');
      const seals = await wormVaultService.listSeals(Number(req.query.limit) || 100);
      await wormVaultService.logVerificationEvent({ tokenId, endpoint: 'GET /seals', result: 'valid', ipAddress: clientIp(req), details: { count: seals.length } });
      res.json({ success: true, data: seals });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async publicVerifySeal(req: Request, res: Response, next: NextFunction) {
    try {
      const tokenId = await this.gate(req, 'GET /seals/:id/verify');
      const result = await wormVaultService.verifySeal(req.params.id);
      await wormVaultService.logVerificationEvent({
        tokenId,
        endpoint: 'GET /seals/:id/verify',
        result: result.verified ? 'valid' : 'invalid',
        sealId: result.seal.id,
        ipAddress: clientIp(req),
        details: {
          signatureValid: result.signatureValid,
          sealHashValid: result.sealHashValid,
          merkleRootValid: result.merkleRootValid,
          chainHeadValid: result.chainHeadValid,
          previousSealLinkValid: result.previousSealLinkValid,
        },
      });
      res.json({ success: true, data: result });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async publicRecordProof(req: Request, res: Response, next: NextFunction) {
    try {
      const tokenId = await this.gate(req, 'GET /records/:sequence/proof');
      const seq = Number(req.params.sequence);
      const proof = await wormVaultService.getInclusionProof(seq);
      await wormVaultService.logVerificationEvent({
        tokenId,
        endpoint: 'GET /records/:sequence/proof',
        result: 'valid',
        sealId: proof.seal.id,
        ipAddress: clientIp(req),
        details: { sequenceNumber: seq },
      });
      res.json({ success: true, data: proof });
    } catch (err) {
      handle(res, next, err);
    }
  }

  async publicVerifyProof(req: Request, res: Response, next: NextFunction) {
    try {
      const tokenId = await this.gate(req, 'POST /proof/verify');
      const { leafHash, proof, merkleRoot } = req.body || {};
      const valid = verifyInclusionProof(String(leafHash || ''), Array.isArray(proof) ? proof : [], String(merkleRoot || ''));
      await wormVaultService.logVerificationEvent({ tokenId, endpoint: 'POST /proof/verify', result: valid ? 'valid' : 'invalid', ipAddress: clientIp(req) });
      res.json({ success: true, data: { valid, verifiedAt: new Date().toISOString() } });
    } catch (err) {
      handle(res, next, err);
    }
  }
}

export const wormVaultController = new WormVaultController();
