import { Router } from 'express';
import { growthController } from '../controllers/growth.controller.js';
import { requireAuth } from '../middleware/auth.js';

export const growthRouter = Router({ mergeParams: true });

// All growth endpoints require authenticated JWT
growthRouter.use(requireAuth);

// 1. Multi-Period Baselines
growthRouter.get('/baselines', (req, res) => growthController.getBaselines(req, res));
growthRouter.post('/baselines/recalculate', (req, res) => growthController.recalculateBaselines(req, res));

// 2. Growth Recommendations
growthRouter.get('/recommendations', (req, res) => growthController.getRecommendations(req, res));
growthRouter.post('/recommendations/generate', (req, res) => growthController.generateRecommendations(req, res));
growthRouter.post('/recommendations/:id/apply', (req, res) => growthController.applyRecommendation(req, res));
growthRouter.post('/recommendations/:id/dismiss', (req, res) => growthController.dismissRecommendation(req, res));

// 3. A/B & Multivariate Experiments
growthRouter.get('/experiments', (req, res) => growthController.getExperiments(req, res));
growthRouter.post('/experiments', (req, res) => growthController.createExperiment(req, res));
growthRouter.post('/experiments/:experimentId/variants/:variantLetter/telemetry', (req, res) =>
  growthController.recordVariantTelemetry(req, res)
);
growthRouter.post('/experiments/:experimentId/evaluate', (req, res) =>
  growthController.evaluateExperiment(req, res)
);
growthRouter.post('/experiments/:experimentId/conclude', (req, res) =>
  growthController.concludeExperiment(req, res)
);

// 4. Mathematical Modeling & Predictive Radar
growthRouter.get('/half-life', (req, res) => growthController.getHalfLifeMetrics(req, res));
growthRouter.post('/lift/estimate', (req, res) => growthController.estimateLift(req, res));

// 5. Stage 10 Analytics Pipeline & Intelligence Dimensions
growthRouter.get('/goal-gap', (req, res) => growthController.getGoalGap(req, res));
growthRouter.get('/goals', (req, res) => growthController.getGoals(req, res));
growthRouter.post('/goals', (req, res) => growthController.setGoal(req, res));
growthRouter.get('/dimensions', (req, res) => growthController.getDimensions(req, res));
growthRouter.get('/forecast', (req, res) => growthController.getForecast(req, res));
growthRouter.post('/forecast', (req, res) => growthController.getForecast(req, res));
growthRouter.get('/repurposing', (req, res) => growthController.getRepurposing(req, res));
growthRouter.post('/pipeline/run', (req, res) => growthController.runPipeline(req, res));

// 6. Phase 54: Automated Viral Content Prediction & A/B Variant Testing Engine
growthRouter.post('/viral/predict', (req, res) => growthController.predictViralScore(req, res));
growthRouter.post('/ab-tests', (req, res) => growthController.createABExperiment(req, res));
growthRouter.get('/ab-tests/:experimentId', (req, res) => growthController.getABExperiment(req, res));
growthRouter.post('/ab-tests/:experimentId/evaluate', (req, res) => growthController.evaluateABSignificance(req, res));


