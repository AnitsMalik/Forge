import { Request, Response } from 'express';

export async function handleMetaWebhook(req: Request, res: Response) {
  if (req.method === 'GET') {
    // Challenge verification
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    return res.status(200).send(challenge);
  }
  return res.sendStatus(200);
}
