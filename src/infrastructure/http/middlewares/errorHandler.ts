import type { ErrorRequestHandler, Request, Response } from 'express';
import { sendError } from '../utils/apiResponse.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error(err instanceof Error ? err.stack : err);
  return sendError(res, 500, 'Internal server error');
};

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, 404, `Route ${req.method} ${req.path} not found`);
};
