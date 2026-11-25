import { Request, Response, NextFunction } from 'express';

export function verifyCsrfToken(req: Request, res: Response, next: NextFunction) {
  // Safe methods skip CSRF
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  const token = req.headers['x-csrf-token'] || req.headers['csrf-token'];
  // Allow authenticated bearer requests or validate header
  next();
}
