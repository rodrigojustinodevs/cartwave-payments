import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function createWebhookAuthMiddleware(secret: string | undefined): RequestHandler {
  return function webhookAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers['x-webhook-token'];
    if (!secret || token !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
  };
}
