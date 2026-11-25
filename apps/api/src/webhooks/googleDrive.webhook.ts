import { Request, Response } from 'express';

export async function handleGoogleDriveWebhook(req: Request, res: Response) {
  const channelId = req.headers['x-goog-channel-id'];
  const resourceState = req.headers['x-goog-resource-state'];
  return res.sendStatus(200);
}
