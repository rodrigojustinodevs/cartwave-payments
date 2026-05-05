'use strict';

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { InitiatePaymentUseCase } = require('./domain/use-cases/InitiatePaymentUseCase');
const { GetPaymentStatusUseCase } = require('./domain/use-cases/GetPaymentStatusUseCase');
const { CreateUserUseCase } = require('./domain/use-cases/CreateUserUseCase');
const { GetUserUseCase } = require('./domain/use-cases/GetUserUseCase');
const { UpdateUserUseCase } = require('./domain/use-cases/UpdateUserUseCase');
const { DeleteUserUseCase } = require('./domain/use-cases/DeleteUserUseCase');
const { ListUsersUseCase } = require('./domain/use-cases/ListUsersUseCase');
const { LoginUseCase } = require('./domain/use-cases/LoginUseCase');
const { PrismaPaymentRepository } = require('./infrastructure/database/repositories/PrismaPaymentRepository');
const { PrismaUserRepository } = require('./infrastructure/database/repositories/PrismaUserRepository');
const { MockPaymentGateway } = require('./infrastructure/providers/MockPaymentGateway');
const { BcryptPasswordHasher } = require('./infrastructure/security/BcryptPasswordHasher');
const { JwtTokenService } = require('./infrastructure/security/JwtTokenService');
const { PaymentController } = require('./infrastructure/http/controllers/PaymentController');
const { UserController } = require('./infrastructure/http/controllers/UserController');
const { AuthController } = require('./infrastructure/http/controllers/AuthController');
const { createPaymentRouter } = require('./infrastructure/http/routes/paymentRoutes');
const { createWebhookRouter } = require('./infrastructure/http/routes/webhookRoutes');
const { PaymentWebhookService } = require('./domain/use-cases/PaymentWebhookService');
const { PaymentWebhookController } = require('./infrastructure/http/controllers/PaymentWebhookController');
const { createWebhookAuthMiddleware } = require('./infrastructure/http/middlewares/webhookAuthMiddleware');
const { createUserRouter } = require('./infrastructure/http/routes/userRoutes');
const { createAuthRouter } = require('./infrastructure/http/routes/authRoutes');
const { createAuthMiddleware, requireRole } = require('./infrastructure/http/middlewares/authMiddleware');
const { errorHandler, notFoundHandler } = require('./infrastructure/http/middlewares/errorHandler');

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} [paymentGatewayBaseURL]
 * @param {object} [overrides]
 * @param {string} [overrides.webhookSecret]
 * @param {import('express').RequestHandler} [overrides.webhookAuthMiddleware]
 */
function createApp(prisma, paymentGatewayBaseURL, overrides = {}) {
  const passwordHasher = overrides.passwordHasher || new BcryptPasswordHasher();
  const tokenService = overrides.tokenService || new JwtTokenService();

  const paymentRepository = new PrismaPaymentRepository(prisma);
  const userRepository = new PrismaUserRepository(prisma);
  const paymentGateway = overrides.paymentGateway || new MockPaymentGateway(paymentGatewayBaseURL);

  const initiatePaymentUseCase = new InitiatePaymentUseCase(
    paymentRepository,
    userRepository,
    paymentGateway
  );
  const getPaymentStatusUseCase = new GetPaymentStatusUseCase(paymentRepository, paymentGateway);

  const createUserUseCase = new CreateUserUseCase(userRepository, passwordHasher);
  const getUserUseCase = new GetUserUseCase(userRepository);
  const updateUserUseCase = new UpdateUserUseCase(userRepository, passwordHasher);
  const deleteUserUseCase = new DeleteUserUseCase(userRepository);
  const listUsersUseCase = new ListUsersUseCase(userRepository);
  const loginUseCase = new LoginUseCase(userRepository, passwordHasher, tokenService);

  const paymentController = new PaymentController(initiatePaymentUseCase, getPaymentStatusUseCase);

  const webhookSecret = overrides.webhookSecret ?? process.env.WEBHOOK_SECRET;
  const webhookAuthMiddleware =
    overrides.webhookAuthMiddleware || createWebhookAuthMiddleware(webhookSecret);
  const paymentWebhookService = new PaymentWebhookService(paymentRepository);
  const paymentWebhookController = new PaymentWebhookController(paymentWebhookService);
  const userController = new UserController({
    createUserUseCase,
    getUserUseCase,
    updateUserUseCase,
    deleteUserUseCase,
    listUsersUseCase,
  });
  const authController = new AuthController(loginUseCase);

  const authMiddleware = overrides.authMiddleware || createAuthMiddleware(tokenService);

  const app = express();
  app.use(express.json());

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

  app.use('/api/v1', createAuthRouter(authController));
  app.use('/api/v1', createUserRouter(userController, authMiddleware, requireRole));
  app.use('/api/v1', createPaymentRouter(paymentController, authMiddleware));
  app.use('/api/v1', createWebhookRouter(paymentWebhookController, webhookAuthMiddleware));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
