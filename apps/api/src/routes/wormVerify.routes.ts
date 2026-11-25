import { Router } from 'express';
import { wormVaultController } from '../controllers/wormVault.controller.js';
import { createRateLimiter } from '../middleware/rateLimiter.js';

/**
 * External Legal Verification Portal (public, token-gated)
 * Mounted at /api/v1/public/worm-verify
 */
export const publicWormVerifyRouter = Router();

const verifierLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Verification portal rate limit reached.',
}).middleware();

publicWormVerifyRouter.use(verifierLimiter);

publicWormVerifyRouter.get('/public-key', (req, res) => wormVaultController.publicKey(req, res));
publicWormVerifyRouter.get('/seals', (req, res, next) => wormVaultController.publicListSeals(req, res, next));
publicWormVerifyRouter.get('/seals/:id/verify', (req, res, next) => wormVaultController.publicVerifySeal(req, res, next));
publicWormVerifyRouter.get('/records/:sequence/proof', (req, res, next) => wormVaultController.publicRecordProof(req, res, next));
publicWormVerifyRouter.post('/proof/verify', (req, res, next) => wormVaultController.publicVerifyProof(req, res, next));
