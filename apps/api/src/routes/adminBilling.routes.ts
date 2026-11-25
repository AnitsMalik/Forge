import { Router } from 'express';
import { AdminBillingController } from '../controllers/adminBilling.controller.js';
import { authenticate, requireSuperadmin } from '../middleware/auth.js';

export const adminBillingRouter = Router();

// Protect all admin billing endpoints with both JWT authentication and Superadmin verification
adminBillingRouter.use(authenticate);
adminBillingRouter.use(requireSuperadmin);

// Financial Metrics & KPIs (MRR, ARR, Churn, ARPU, LTV, Plan breakdown)
adminBillingRouter.get('/metrics', AdminBillingController.getMetrics);

// Historical monthly collected revenue trend
adminBillingRouter.get('/revenue-history', AdminBillingController.getRevenueHistory);

// Global cross-tenant subscriptions roster
adminBillingRouter.get('/subscriptions', AdminBillingController.listSubscriptions);

// Platform-wide Automated Payment & Subscription Reconciliation
adminBillingRouter.post('/reconcile', AdminBillingController.reconcileAll);

// Global cross-tenant billing audit logs
adminBillingRouter.get('/audit-logs', AdminBillingController.listAuditLogs);

// Webhook & Dead-Letter Queue (DLQ) Recovery Endpoints
adminBillingRouter.get('/dlq/stats', AdminBillingController.getDlqStats);
adminBillingRouter.get('/dlq', AdminBillingController.listDlqDeliveries);
adminBillingRouter.post('/dlq/:id/replay', AdminBillingController.replayDelivery);
adminBillingRouter.post('/dlq/replay-all', AdminBillingController.replayAllDeliveries);
adminBillingRouter.delete('/dlq/:id', AdminBillingController.discardDelivery);

// Platform-wide Billing Communications & Email Inspection
adminBillingRouter.get('/emails', AdminBillingController.listAllEmails);
adminBillingRouter.get('/emails/:id/preview', AdminBillingController.previewEmail);

// Platform-wide Usage Alerts & Quota Telemetry
adminBillingRouter.get('/usage/alerts', AdminBillingController.listUsageAlerts);
adminBillingRouter.post('/usage/alerts/evaluate', AdminBillingController.evaluateTenantUsage);

// 1. Subscription Plan Management
adminBillingRouter.get('/plans', AdminBillingController.listPlans);
adminBillingRouter.put('/plans/:id', AdminBillingController.updatePlan);

// 2. Customer Subscription Management & Details
adminBillingRouter.get('/customers/:tenantId', AdminBillingController.getCustomerDetails);
adminBillingRouter.post('/customers/:tenantId/assign-plan', AdminBillingController.assignCustomerPlan);

// 3. Enterprise Custom Entitlements Management
adminBillingRouter.post('/customers/:tenantId/entitlements', AdminBillingController.setCustomerEntitlement);
adminBillingRouter.delete('/customers/:tenantId/entitlements/:resource', AdminBillingController.removeCustomerEntitlement);
adminBillingRouter.post('/entitlements/:auditId/rollback', AdminBillingController.rollbackEntitlement);

// 4. Override Governance & Audit Trail
adminBillingRouter.get('/entitlements/audit-logs', AdminBillingController.listEntitlementAuditLogs);

// 5. Subscription Lifecycle Jobs Execution (Automated Renewals, Expirations, Quota Resets)
adminBillingRouter.post('/lifecycle/run-jobs', AdminBillingController.runLifecycleJobs);

// 6. Cross-Tenant Invoices & Payment Transactions Roster
adminBillingRouter.get('/invoices', AdminBillingController.listInvoices);

// 7. Platform-Wide Quota Monitoring & Dispute Resolution
adminBillingRouter.get('/usage/overview', AdminBillingController.getPlatformUsageOverview);
adminBillingRouter.post('/usage/disputes/resolve', AdminBillingController.resolveQuotaDispute);


