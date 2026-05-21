import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { TokenServicePort } from '../../../domain/ports/TokenServicePort.js';
import { sendError } from '../utils/apiResponse.js';

export function createAuthMiddleware(tokenService: TokenServicePort): RequestHandler {
  return function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const header = req.headers.authorization || '';
    const parts = header.split(' ');
    const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;

    if (!token) {
      return sendError(res, 401, 'Missing or invalid Authorization header');
    }

    try {
      const payload = tokenService.verify(token);
      req.user = { id: payload.sub, role: payload.role };
      return next();
    } catch {
      return sendError(res, 401, 'Invalid or expired token');
    }
  };
}

export function requireRole(role: string): RequestHandler {
  return function roleMiddleware(req: Request, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== role) {
      return sendError(res, 403, 'Forbidden');
    }
    return next();
  };
}
