import { Request, Response } from 'express';

export async function handleGenericWebhook(req: Request, res: Response) {
  return res.json({ received: true });
}
