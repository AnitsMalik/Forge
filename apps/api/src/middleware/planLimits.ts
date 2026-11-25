import type { Request, Response, NextFunction } from 'express';
import { EntitlementService } from '../services/entitlement.service.js';
import type { QuotaResource, EntitlementCheckResult } from '@socialforge/shared';

export type EntitlementAction =
  | 'canCreateBrand'
  | 'canConnectSocialAccount'
  | 'canCreateUser'
  | 'canPublish'
  | 'canSchedule'
  | 'canRenderVideo'
  | 'canUseAI'
  | 'canUseAdvancedAnalytics'
  | 'canUseAds'
  | 'canUploadStorage';

/**
 * Middleware factory to enforce SaaS entitlements and plan limits.
 * Resolves limits authoritatively via EntitlementService:
 * tenant -> subscription -> plan -> entitlement
 */
export function enforceEntitlement(action: EntitlementAction, requestedAmount: number = 1) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Tenant context required for entitlement verification.',
          },
        });
        return;
      }

      // Bypass limits only when explicitly requested via header by platform superadmins
      if ((req.user as any)?.isSuperAdmin && req.headers['x-superadmin-bypass'] === 'true') {
        return next();
      }

      let check: EntitlementCheckResult;
      switch (action) {
        case 'canCreateBrand':
          check = await EntitlementService.canCreateBrand(tenantId);
          break;
        case 'canConnectSocialAccount':
          check = await EntitlementService.canConnectSocialAccount(tenantId);
          break;
        case 'canCreateUser':
          check = await EntitlementService.canCreateUser(tenantId);
          break;
        case 'canPublish':
          check = await EntitlementService.canPublish(tenantId, requestedAmount);
          break;
        case 'canSchedule':
          check = await EntitlementService.canSchedule(tenantId, requestedAmount);
          break;
        case 'canRenderVideo':
          check = await EntitlementService.canRenderVideo(tenantId, requestedAmount);
          break;
        case 'canUseAI':
          check = await EntitlementService.canUseAI(tenantId, requestedAmount);
          break;
        case 'canUseAdvancedAnalytics':
          check = await EntitlementService.canUseAdvancedAnalytics(tenantId);
          break;
        case 'canUseAds':
          check = await EntitlementService.canUseAds(tenantId);
          break;
        case 'canUploadStorage':
          check = await EntitlementService.canUploadStorage(tenantId, requestedAmount);
          break;
        default:
          return next();
      }

      if (!check.allowed) {
        const featureLabel = (check as any).featureLabel || String(action);
        const billingPeriod = (check as any).billingPeriod || new Date().toISOString().slice(0, 7);
        const explanation =
          (check as any).explanation ||
          check.reason ||
          `Quota exceeded for ${featureLabel}: ${check.current}/${check.limit} on ${check.planName}. Upgrade required.`;
        const upgradeOption = (check as any).upgradeOption || {
          required: true,
          recommendedPlan: check.planId === 'professional' ? 'business' : 'professional',
          recommendedPlanName: check.planId === 'professional' ? 'Business Plan' : 'Professional Plan',
          upgradeUrl: check.planId === 'professional' ? '/billing?plan=business' : '/billing?plan=professional',
          message: `Upgrade your plan to unlock higher limits for ${featureLabel}.`,
        };

        const errorPayload = {
          code: 'QUOTA_EXCEEDED',
          message: explanation,
          currentUsage: check.current,
          allowedUsage: check.limit,
          remainingQuota: check.remaining,
          feature: action,
          featureLabel,
          billingPeriod,
          renewalDate: (check as any).renewalDate || null,
          plan: {
            id: check.planId,
            name: check.planName,
          },
          subscriptionStatus: check.status,
          explanation,
          upgrade: upgradeOption,
          // backwards compatibility
          entitlement: action,
          resource: action,
          current: check.current,
          limit: check.limit,
          remaining: check.remaining,
          status: check.status,
          planId: check.planId,
          planName: check.planName,
          upgradeRequired: true,
        };

        res.status(403).json({
          success: false,
          error: errorPayload,
          quota: {
            feature: action,
            featureLabel,
            currentUsage: check.current,
            allowedUsage: check.limit,
            remainingQuota: check.remaining,
            billingPeriod,
            renewalDate: (check as any).renewalDate || null,
            plan: {
              id: check.planId,
              name: check.planName,
            },
            subscriptionStatus: check.status,
          },
          upgrade: upgradeOption,
        });
        return;
      }

      next();
    } catch (err: any) {
      console.error(`[enforceEntitlement] Error checking ${action}:`, err);
      res.status(500).json({
        success: false,
        error: {
          code: 'ENTITLEMENT_VERIFICATION_ERROR',
          message: 'Unable to verify plan subscription entitlements. Please retry.',
        },
      });
    }
  };
}

/**
 * Universal Stage 9 PlanGuard Middleware
 */
export function requirePlanGuard(resource: QuotaResource, requestedAmount: number = 1) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Tenant context required for entitlement verification.',
          },
        });
        return;
      }

      // Bypass limits only when explicitly requested via header by platform superadmins
      if ((req.user as any)?.isSuperAdmin && req.headers['x-superadmin-bypass'] === 'true') {
        return next();
      }

      const { planGuardService } = await import('../services/billing/planGuard.service.js');
      const check = await planGuardService.check(tenantId, resource, requestedAmount, {
        level: req.body?.level || req.body?.autonomousMode || req.query?.level,
        connectorType: req.body?.provider || req.body?.connectorType,
        days: req.query?.days ? parseInt(req.query.days as string, 10) : undefined,
      });

      if (!check.allowed) {
        const featureLabel = check.featureLabel || String(check.resource);
        const billingPeriod = check.billingPeriod || new Date().toISOString().slice(0, 7);
        const explanation =
          check.explanation ||
          check.reason ||
          `Quota exceeded for ${featureLabel}: ${check.current}/${check.limit} on ${check.planName}. Upgrade required.`;
        const upgradeOption = check.upgradeOption || {
          required: true,
          recommendedPlan: check.planId === 'professional' ? 'business' : 'professional',
          recommendedPlanName: check.planId === 'professional' ? 'Business Plan' : 'Professional Plan',
          upgradeUrl: check.planId === 'professional' ? '/billing?plan=business' : '/billing?plan=professional',
          message: `Upgrade your plan to unlock higher limits for ${featureLabel}.`,
        };

        const errorPayload = {
          code: 'QUOTA_EXCEEDED',
          message: explanation,
          currentUsage: check.current,
          allowedUsage: check.limit,
          remainingQuota: check.remaining,
          feature: check.resource,
          featureLabel,
          billingPeriod,
          renewalDate: (check as any).renewalDate || null,
          plan: {
            id: check.planId,
            name: check.planName,
          },
          subscriptionStatus: check.status,
          explanation,
          upgrade: upgradeOption,
          // backwards compatibility
          resource: check.resource,
          current: check.current,
          limit: check.limit,
          remaining: check.remaining,
          planId: check.planId,
          planName: check.planName,
          status: check.status,
          isGracePeriod: check.isGracePeriod,
          upgradeRequired: true,
        };

        res.status(403).json({
          success: false,
          error: errorPayload,
          quota: {
            feature: check.resource,
            featureLabel,
            currentUsage: check.current,
            allowedUsage: check.limit,
            remainingQuota: check.remaining,
            billingPeriod,
            renewalDate: (check as any).renewalDate || null,
            plan: {
              id: check.planId,
              name: check.planName,
            },
            subscriptionStatus: check.status,
          },
          upgrade: upgradeOption,
        });
        return;
      }

      next();
    } catch (err: any) {
      next(err);
    }
  };
}

export const requireEntitlement = requirePlanGuard;
export const enforcePlanLimit = requirePlanGuard;

