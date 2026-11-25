/**
 * Public White-Label Portal & Custom Domain Routing
 * SocialForge Platform v4.6.0
 */

import { Router } from 'express';
import { customDomainController } from '../controllers/customDomain.controller.js';

export const whiteLabelRouter = Router();

// Public endpoint to resolve white-label branding by hostname or ?domain=...
whiteLabelRouter.get('/config', (req, res, next) => customDomainController.resolveWhiteLabelConfig(req, res, next));

// Public validation to check if a domain is available or registered
whiteLabelRouter.get('/validate-domain', (req, res, next) => customDomainController.validateDomain(req, res, next));
