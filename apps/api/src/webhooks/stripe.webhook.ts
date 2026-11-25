import { Request, Response } from 'express';

export async function handleStripeWebhook(req: Request, res: Response) {
  return res.json({ received: true });
}
