'use strict';

const { Router } = require('express');
const { body, validationResult } = require('express-validator');

/**
 * @swagger
 * /api/v1/webhooks/payment:
 *   post:
 *     summary: Webhook de atualização de pagamento (provedor externo)
 *     tags: [Webhooks]
 *     security: []
 *     parameters:
 *       - in: header
 *         name: X-Webhook-Token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookEvent'
 *     responses:
 *       200:
 *         description: Evento recebido
 *       400:
 *         description: Corpo inválido
 *       401:
 *         description: Token de webhook inválido
 */

function createWebhookRouter(paymentWebhookController, webhookAuthMiddleware) {
  const router = Router();

  const validateWebhookBody = [
    body('event').isString().notEmpty().withMessage('event is required'),
    body('data')
      .isObject()
      .withMessage('data must be an object')
      .custom((value) => {
        const tx = value && (value.tx_id || value.id);
        if (typeof tx !== 'string' || !tx.length) {
          throw new Error('data must include non-empty tx_id or id');
        }
        return true;
      }),
  ];

  router.post(
    '/webhooks/payment',
    webhookAuthMiddleware,
    validateWebhookBody,
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      return paymentWebhookController.handlePaymentWebhook(req, res);
    }
  );

  return router;
}

module.exports = { createWebhookRouter };
