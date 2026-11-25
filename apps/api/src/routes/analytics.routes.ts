import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';

export const analyticsRouter = Router({ mergeParams: true });

analyticsRouter.use(authenticate);

analyticsRouter.get('/overview', AnalyticsController.getOverview);
analyticsRouter.get('/posts/:postId', AnalyticsController.getPostAnalytics);
analyticsRouter.get('/export', AnalyticsController.exportReport);
analyticsRouter.post('/sync', AnalyticsController.syncMetrics);
analyticsRouter.post('/posts/:postId/sync', AnalyticsController.syncSinglePost);

// Stage 6: Unified Telemetry, Winner Detection & Continuous Brand Brain Learning
analyticsRouter.get('/winners', AnalyticsController.getWinners);
analyticsRouter.post('/detect-winners', AnalyticsController.detectWinners);
analyticsRouter.get('/learning-insights', AnalyticsController.getLearningInsights);
analyticsRouter.post('/telemetry/ingest', AnalyticsController.ingestTelemetry);
analyticsRouter.get('/baselines', AnalyticsController.getBaselines);

// Closed-Loop AI Marketing Advisor & Campaign Synthesizer
analyticsRouter.get('/advisor', AnalyticsController.getAdvisorDiagnosis);
analyticsRouter.post('/advisor/apply', AnalyticsController.applyAdvisorProposal);

