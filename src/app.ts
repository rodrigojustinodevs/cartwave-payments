import express from 'express';
import swaggerUi from 'swagger-ui-express';
import type { PrismaClient } from '@prisma/client';
import swaggerSpec from './config/swagger.js';
import { InitiatePaymentUseCase } from './domain/use-cases/InitiatePaymentUseCase.js';
import { GetPaymentStatusUseCase } from './domain/use-cases/GetPaymentStatusUseCase.js';
import { CreateUserUseCase } from './domain/use-cases/CreateUserUseCase.js';
import { GetUserUseCase } from './domain/use-cases/GetUserUseCase.js';
import { UpdateUserUseCase } from './domain/use-cases/UpdateUserUseCase.js';
import { DeleteUserUseCase } from './domain/use-cases/DeleteUserUseCase.js';
import { ListUsersUseCase } from './domain/use-cases/ListUsersUseCase.js';
import { LoginUseCase } from './domain/use-cases/LoginUseCase.js';
import { PrismaPaymentRepository } from './infrastructure/database/repositories/PrismaPaymentRepository.js';
import { PrismaUserRepository } from './infrastructure/database/repositories/PrismaUserRepository.js';
import { MockPaymentGateway } from './infrastructure/providers/MockPaymentGateway.js';
import { BcryptPasswordHasher } from './infrastructure/security/BcryptPasswordHasher.js';
import { JwtTokenService } from './infrastructure/security/JwtTokenService.js';
import { PaymentController } from './infrastructure/http/controllers/PaymentController.js';
import { UserController } from './infrastructure/http/controllers/UserController.js';
import { AuthController } from './infrastructure/http/controllers/AuthController.js';
import { createPaymentRouter } from './infrastructure/http/routes/paymentRoutes.js';
import { createWebhookRouter } from './infrastructure/http/routes/webhookRoutes.js';
import { PaymentWebhookService } from './domain/use-cases/PaymentWebhookService.js';
import { PaymentWebhookController } from './infrastructure/http/controllers/PaymentWebhookController.js';
import { createWebhookAuthMiddleware } from './infrastructure/http/middlewares/webhookAuthMiddleware.js';
import { createUserRouter } from './infrastructure/http/routes/userRoutes.js';
import { createAuthRouter } from './infrastructure/http/routes/authRoutes.js';
import { createAuthMiddleware, requireRole } from './infrastructure/http/middlewares/authMiddleware.js';
import { errorHandler, notFoundHandler } from './infrastructure/http/middlewares/errorHandler.js';
import type { AppOverrides } from './types/app.js';

function createApp(prisma: PrismaClient, paymentGatewayBaseURL?: string, overrides: AppOverrides = {}) {
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
  const getPaymentStatusUseCase = new GetPaymentStatusUseCase(paymentRepository);

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

export { createApp };
