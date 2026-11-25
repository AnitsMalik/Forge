import { Router } from 'express';
import { DataController } from '../controllers/data.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

// 1. Marketing Objects CRUD & Synthesis
router.get('/objects', DataController.listMarketingObjects);
router.get('/objects/:id', DataController.getMarketingObject);
router.post('/objects', DataController.createMarketingObject);
router.post('/objects/:id/retry', DataController.retryMarketingObject);
router.post('/objects/:id/synthesize-post', DataController.synthesizePost);
router.post('/objects/batch-synthesize', DataController.batchSynthesize);
router.delete('/objects/:id', DataController.deleteMarketingObject);

// 2. Data Ingestion Endpoints
router.post('/ingest/csv', DataController.ingestCsv);
router.post('/ingest/sheets', DataController.ingestGoogleSheets);
router.post('/ingest/drive', DataController.ingestGoogleDrive);
router.post('/validate/csv', DataController.validateCsv);

// 3. Audit Logs & Stats
router.get('/audit-logs', DataController.listAuditLogs);
router.get('/stats', DataController.getStats);

export default router;
