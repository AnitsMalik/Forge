import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ApiResponse } from '@socialforge/shared';
import { PlanGuardError } from '../services/billing/planGuard.service.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: Array<{ field?: string; issue: string }>
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response<any>,
  _next: NextFunction
) {
  if (err instanceof PlanGuardError || (err as any).name === 'PlanGuardError') {
    const pErr = err as PlanGuardError;
    const json = typeof pErr.toJSON === 'function' ? pErr.toJSON() : {
      code: 'QUOTA_EXCEEDED',
      message: pErr.message,
      currentUsage: (pErr as any).currentUsage ?? (pErr as any).checkResult?.current ?? 0,
      allowedUsage: (pErr as any).allowedUsage ?? (pErr as any).checkResult?.limit ?? 0,
      remainingQuota: (pErr as any).remainingQuota ?? (pErr as any).checkResult?.remaining ?? 0,
      feature: (pErr as any).feature ?? String((pErr as any).checkResult?.resource || 'unknown'),
      featureLabel: (pErr as any).featureLabel || String((pErr as any).checkResult?.resource || 'Feature'),
      billingPeriod: (pErr as any).billingPeriod || new Date().toISOString().slice(0, 7),
      plan: {
        id: (pErr as any).checkResult?.planId || 'free',
        name: (pErr as any).checkResult?.planName || 'Free Plan',
      },
      subscriptionStatus: (pErr as any).checkResult?.status || 'active',
      explanation: (pErr as any).explanation || pErr.message,
      upgrade: (pErr as any).upgradeOption || (pErr as any).checkResult?.upgradeOption,
    };

    return res.status(403).json({
      success: false,
      error: json as any,
      quota: {
        feature: json.feature,
        featureLabel: json.featureLabel,
        currentUsage: json.currentUsage,
        allowedUsage: json.allowedUsage,
        remainingQuota: json.remainingQuota,
        billingPeriod: json.billingPeriod,
        plan: json.plan,
        subscriptionStatus: json.subscriptionStatus,
      } as any,
      upgrade: json.upgrade as any,
    });
  }

  if (err instanceof AppError) {
    const isMeta = 'metaCode' in err || 'safeMessage' in err || 'metaType' in err;
    const metaCode = (err as any).rawMetaCode ?? (err as any).metaCode;
    const metaType = (err as any).metaType;
    const safeMessage = (err as any).safeMessage || err.message;
    const fbtraceId = (err as any).fbtraceId;

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        ...(isMeta ? { metaCode, metaType, safeMessage, fbtraceId } : {}),
      },
      ...(isMeta ? { metaCode, metaType, safeMessage, fbtraceId } : {}),
    });
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details,
      },
    });
  }

  console.error('Unhandled Server Error:', err);

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err?.message || 'An unexpected internal error occurred.',
    },
  });
}
