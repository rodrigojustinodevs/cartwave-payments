'use strict';

const { Router } = require('express');
const { body, param, query } = require('express-validator');
const { UserRole } = require('../../../domain/entities/User');

/**
 * @swagger
 * /api/v1/users:
 *   post:
 *     summary: Registrar usuário
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserCreateRequest'
 *     responses:
 *       201:
 *         description: Usuário criado
 *       409:
 *         description: Email já cadastrado
 *   get:
 *     summary: Listar usuários (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Lista paginada
 */

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Perfil do usuário autenticado
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */

/**
 * @swagger
 * /api/v1/users/{id}:
 *   get:
 *     summary: Obter usuário por ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *   put:
 *     summary: Atualizar usuário (dono ou admin via regra no controller)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Remover usuário (admin)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */

function createUserRouter(userController, authMiddleware, requireRole) {
  const router = Router();

  const registerValidation = [
    body('email').isEmail().withMessage('email must be valid').normalizeEmail(),
    body('name').isString().trim().isLength({ min: 2 }).withMessage('name must be at least 2 characters'),
    body('password').isString().isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  ];

  router.post('/users', registerValidation, (req, res) => userController.create(req, res));

  router.get('/users/me', authMiddleware, (req, res) => userController.getMe(req, res));

  const listValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('pageSize must be between 1 and 100'),
  ];

  router.get(
    '/users',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    listValidation,
    (req, res) => userController.list(req, res)
  );

  router.get(
    '/users/:id',
    authMiddleware,
    param('id').isUUID().withMessage('id must be a UUID'),
    (req, res) => userController.getById(req, res)
  );

  const updateValidation = [
    body('name').optional().isString().trim().isLength({ min: 2 }).withMessage('name must be at least 2 characters'),
    body('password').optional().isString().isLength({ min: 8 }).withMessage('password must be at least 8 characters'),
  ];

  router.put(
    '/users/:id',
    authMiddleware,
    param('id').isUUID().withMessage('id must be a UUID'),
    updateValidation,
    (req, res) => userController.update(req, res)
  );

  router.delete(
    '/users/:id',
    authMiddleware,
    requireRole(UserRole.ADMIN),
    param('id').isUUID().withMessage('id must be a UUID'),
    (req, res) => userController.delete(req, res)
  );

  return router;
}

module.exports = { createUserRouter };
