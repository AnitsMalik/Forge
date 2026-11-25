import { Router } from 'express';
import { OnboardingController } from '../controllers/onboarding.controller.js';
import { FtueController } from '../controllers/ftue.controller.js';
import { authenticate } from '../middleware/auth.js';

export const onboardingRouter = Router();

// Protect all onboarding endpoints with JWT authentication
onboardingRouter.use(authenticate);

// ============================================================================
// FTUE (First-Time User Experience) Dedicated Endpoints
// ============================================================================
onboardingRouter.get('/ftue/state', FtueController.getState);
onboardingRouter.post('/ftue/role', FtueController.saveRole);
onboardingRouter.post('/ftue/workspace', FtueController.saveWorkspace);
onboardingRouter.post('/ftue/brand-kit', FtueController.saveBrandKit);
onboardingRouter.post('/ftue/generate-brand-ai', FtueController.generateBrandAi);
onboardingRouter.post('/ftue/first-post', FtueController.createFirstPost);
onboardingRouter.post('/ftue/schedule-first-post', FtueController.scheduleFirstPost);
onboardingRouter.post('/ftue/track-event', FtueController.trackEvent);
onboardingRouter.get('/ftue/admin-analytics', FtueController.getAdminAnalytics);

// ============================================================================
// Legacy & Complementary Onboarding Endpoints
// ============================================================================
// 1. Current Onboarding Progress & Status
onboardingRouter.get('/status', OnboardingController.getStatus);

// 2. Step 1: Create Brand & Brand Kit
onboardingRouter.post('/brand', OnboardingController.createBrand);

// 3. Step 2: Map Discovered Social Accounts / Pages to Brand
onboardingRouter.post('/map-assets', OnboardingController.mapAssets);

// 4. Step 3: Configure Communication Channel (Email, WhatsApp, SMS, Voice)
onboardingRouter.post('/communication', OnboardingController.configureCommunication);

// 5. Step 4: Live Verification across all channels
onboardingRouter.get('/verify', OnboardingController.verifyChannels);

// 6. Complete Onboarding & Activate Marketing Workspace
onboardingRouter.post('/complete', OnboardingController.complete);

export default onboardingRouter;

