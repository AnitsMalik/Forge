import { Router } from 'express';
import { BillingController } from '../controllers/billing.controller.js';
import { authenticate } from '../middleware/auth.js';

export const billingRouter = Router();

// Public webhook endpoint (signature verified internally)
billingRouter.post('/webhook', BillingController.handleWebhook);

// Public/authenticated plan catalog endpoint
billingRouter.get('/plans', BillingController.listPlans);

// Protected Workspace Billing Endpoints
billingRouter.use(authenticate);
billingRouter.get('/usage', BillingController.getUsage);
billingRouter.post('/checkout', BillingController.createCheckout);
billingRouter.post('/checkout/verify', BillingController.verifyCheckout);
billingRouter.post('/reconcile', BillingController.reconcileSubscription);
billingRouter.post('/portal', BillingController.createPortal);
billingRouter.get('/subscription', BillingController.getSubscription);
billingRouter.put('/billing-info', BillingController.updateBillingInfo);
billingRouter.post('/subscription/change', BillingController.changeSubscription);
billingRouter.post('/addons/purchase', BillingController.purchaseAddon);
billingRouter.post('/subscription/sync', BillingController.syncSubscription);
billingRouter.post('/subscription/cancel', BillingController.cancelSubscription);
billingRouter.post('/subscription/resume', BillingController.resumeSubscription);
billingRouter.get('/invoices', BillingController.listInvoices);
billingRouter.get('/invoices/:id/download', BillingController.downloadInvoicePdf);
billingRouter.post('/invoices/:id/retry', BillingController.retryInvoicePayment);
billingRouter.get('/audit-logs', BillingController.listAuditLogs);

// Dunning & Billing Notifications Endpoints
billingRouter.get('/dunning', BillingController.getDunningStatus);
billingRouter.post('/dunning/process', BillingController.processDunning);
billingRouter.get('/notifications', BillingController.getNotifications);
billingRouter.patch('/notifications/:id/dismiss', BillingController.dismissNotification);

// Billing Email Communications Endpoints
billingRouter.get('/emails', BillingController.listEmails);
billingRouter.post('/emails/retry-failed', BillingController.retryFailedEmails);
billingRouter.get('/emails/:id', BillingController.getEmail);
billingRouter.get('/emails/:id/preview', BillingController.previewEmail);
billingRouter.post('/emails/:id/resend', BillingController.resendEmail);

// Centralized Subscription Usage Engine Endpoints (Phase 6)
billingRouter.get('/usage/engine', BillingController.getEngineUsage);
billingRouter.get('/usage/operations', BillingController.getQuotaOperations);
billingRouter.post('/usage/meter-operation', BillingController.meterOperation);
billingRouter.post('/usage/enforce-quota', BillingController.enforceQuota);

// Multi-Tier Usage Alert Endpoints
billingRouter.get('/usage/alerts', BillingController.getUsageAlerts);
billingRouter.post('/usage/alerts/evaluate', BillingController.evaluateUsageAlerts);

