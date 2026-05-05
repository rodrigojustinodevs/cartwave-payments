'use strict';

/**
 * Valida header X-Webhook-Token contra o segredo configurado.
 *
 * @param {string|undefined} secret
 */
function createWebhookAuthMiddleware(secret) {
  return function webhookAuthMiddleware(req, res, next) {
    const token = req.headers['x-webhook-token'];
    if (!secret || token !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
  };
}

module.exports = { createWebhookAuthMiddleware };
