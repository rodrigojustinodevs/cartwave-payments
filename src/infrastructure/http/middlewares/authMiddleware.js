'use strict';

/**
 * @param {import('../../../domain/ports/TokenServicePort').TokenServicePort} tokenService
 */
function createAuthMiddleware(tokenService) {
  return function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    const parts = header.split(' ');
    const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;

    if (!token) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header' });
    }

    try {
      const payload = tokenService.verify(token);
      req.user = { id: payload.sub, role: payload.role };
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}

function requireRole(role) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = { createAuthMiddleware, requireRole };
