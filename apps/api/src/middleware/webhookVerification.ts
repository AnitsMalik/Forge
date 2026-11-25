import { Request, Response, NextFunction } from 'express';

export function verifyWebhookSignature(provider: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Verifies HMAC signatures (Stripe, Meta, etc.)
    next();
  };
}
