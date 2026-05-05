'use strict';

const { Router } = require('express');
const { body } = require('express-validator');

/**
 * @swagger
 * /api/v1/payments:
 *   post:
 *     summary: Iniciar pagamento
 *     description: Requer Bearer JWT. `user_id` no corpo deve coincidir com o usuário autenticado (exceto admin).
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentRequest'
 *     responses:
 *       201:
 *         description: Pagamento criado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       400:
 *         description: Validação falhou (corpo inválido ou regra de domínio)
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Proibido (ex. user_id não corresponde ao token)
 *       500:
 *         description: Erro interno do servidor
 */

/**
 * @swagger
 * /api/v1/payments/{paymentId}:
 *   get:
 *     summary: Consultar status do pagamento
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         description: Identificador do pagamento (UUID)
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Status atual do pagamento
 *       403:
 *         description: Sem permissão para este pagamento
 *       404:
 *         description: Pagamento não encontrado
 */

function createPaymentRouter(paymentController, authMiddleware) {
  const router = Router();

  const initiatePaymentValidation = [
    body('amount').isNumeric().withMessage('amount must be a number').custom((v) => v > 0).withMessage('amount must be positive'),
    body('currency').isString().notEmpty().withMessage('currency is required'),
    body('method').isString().notEmpty().withMessage('method is required'),
    body('product_id').isString().notEmpty().withMessage('product_id is required'),
    body('user_id').isUUID().withMessage('user_id must be a valid UUID'),
  ];

  router.post(
    '/payments',
    authMiddleware,
    initiatePaymentValidation,
    (req, res) => paymentController.initiatePayment(req, res)
  );

  router.get(
    '/payments/:paymentId',
    authMiddleware,
    (req, res) => paymentController.getPaymentStatus(req, res)
  );

  return router;
}

module.exports = { createPaymentRouter };
