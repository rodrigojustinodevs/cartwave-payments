'use strict';

const { Router } = require('express');
const { body } = require('express-validator');

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
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Validação falhou
 *       401:
 *         description: Credenciais inválidas
 */

function createAuthRouter(authController) {
  const router = Router();

  const loginValidation = [
    body('email').isEmail().withMessage('email must be valid').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('password is required'),
  ];

  router.post('/auth/login', loginValidation, (req, res) => authController.login(req, res));

  return router;
}

module.exports = { createAuthRouter };
