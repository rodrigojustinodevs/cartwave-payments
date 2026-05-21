import { Router, type Request, type Response, type RequestHandler } from 'express';
import { body } from 'express-validator';
import type { PaymentController } from '../controllers/PaymentController.js';

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
 *               $ref: '#/components/schemas/PaymentSuccessResponse'
 *       400:
 *         description: Validação falhou (corpo inválido ou regra de domínio)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       403:
 *         description: Proibido (ex. user_id não corresponde ao token)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: Erro interno do servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentStatusSuccessResponse'
 *       403:
 *         description: Sem permissão para este pagamento
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       404:
 *         description: Pagamento não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */

function createPaymentRouter(paymentController: PaymentController, authMiddleware: RequestHandler) {
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
    (req: Request, res: Response) => paymentController.initiatePayment(req, res)
  );

  router.get('/payments/:paymentId', authMiddleware, (req: Request, res: Response) =>
    paymentController.getPaymentStatus(req, res)
  );

  return router;
}

export { createPaymentRouter };
