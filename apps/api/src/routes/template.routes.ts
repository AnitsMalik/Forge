import { Router } from 'express';
import { TemplateController } from '../controllers/templateController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';

export const templateRouter = Router({ mergeParams: true });

// Public/direct preview for embedding in <img> tags
templateRouter.get('/preview', TemplateController.previewTemplate);

// Protected / Optional Auth routes
templateRouter.get('/', optionalAuthenticate, TemplateController.listTemplates);
templateRouter.post('/', authenticate, TemplateController.createTemplate);
templateRouter.get('/:templateId', optionalAuthenticate, TemplateController.getTemplate);
templateRouter.post('/:templateId/duplicate', authenticate, TemplateController.duplicateTemplate);
templateRouter.delete('/:templateId', authenticate, TemplateController.deleteTemplate);
templateRouter.post('/render', authenticate, TemplateController.renderTemplate);
templateRouter.post('/ai-poster', authenticate, TemplateController.generateAiPoster);

// Stage 4: Versioning, Validation & Platform Variants
templateRouter.post('/select', authenticate, TemplateController.selectTemplate);
templateRouter.get('/:templateId/versions', authenticate, TemplateController.listVersions);
templateRouter.post('/:templateId/versions', authenticate, TemplateController.createVersion);
templateRouter.post('/:templateId/versions/:versionNumber/rollback', authenticate, TemplateController.rollbackVersion);
templateRouter.post('/:templateId/validate', authenticate, TemplateController.validateTemplate);
templateRouter.post('/:templateId/variants', authenticate, TemplateController.generateVariants);

export default templateRouter;
