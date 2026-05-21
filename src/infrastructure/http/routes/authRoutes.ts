import { Router, type Request, type Response } from 'express';
import { body } from 'express-validator';
import type { AuthController } from '../controllers/AuthController.js';

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login (JWT)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Token emitido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccessResponse'
 *       400:
 *         description: Validação falhou
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */

function createAuthRouter(authController: AuthController) {
  const router = Router();

  const loginValidation = [
    body('email').isEmail().withMessage('email must be valid').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('password is required'),
  ];

  router.post('/auth/login', loginValidation, (req: Request, res: Response) =>
    authController.login(req, res)
  );

  return router;
}

export { createAuthRouter };
