import { Router } from 'express';
import {
  listBrands,
  getBrandById,
  createBrand,
  updateBrand,
  updateBrandKit,
  deleteBrand,
} from '../controllers/brand.controller.js';
import { BrandBrainController } from '../controllers/brandBrain.controller.js';
import { createCopilotPlan, listCopilotPlans } from '../controllers/agent.controller.js';
import { authenticate } from '../middleware/auth.js';
import { enforcePlanLimit } from '../middleware/planLimits.js';

export const brandRouter = Router();

brandRouter.use(authenticate);

brandRouter.get('/', listBrands);
brandRouter.post('/', enforcePlanLimit('max_brands'), createBrand);
brandRouter.get('/:brandId', getBrandById);
brandRouter.patch('/:brandId', updateBrand);
brandRouter.put('/:brandId', updateBrand);
brandRouter.delete('/:brandId', deleteBrand);
brandRouter.put('/:brandId/kit', updateBrandKit);

// 16-Dimension Centralized Brand Brain & Website Extraction Routes
brandRouter.get('/:brandId/brain', BrandBrainController.getBrandBrain);
brandRouter.put('/:brandId/brain', BrandBrainController.updateBrandBrain);
brandRouter.post('/:brandId/brain/extract-website', BrandBrainController.extractWebsite);
brandRouter.get('/:brandId/brain/ai-context', BrandBrainController.getAiContext);

// Brand-scoped Copilot Automation Endpoints
brandRouter.post('/:brandId/agent/copilot/automation', createCopilotPlan);
brandRouter.get('/:brandId/agent/copilot/automations', listCopilotPlans);
