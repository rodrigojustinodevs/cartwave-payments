import type { RequestHandler } from 'express';
import type { PaymentGateway } from '../domain/ports/PaymentGateway.js';
import type { PasswordHasherPort } from '../domain/ports/PasswordHasherPort.js';
import type { TokenServicePort } from '../domain/ports/TokenServicePort.js';

export interface AppOverrides {
  webhookSecret?: string;
  webhookAuthMiddleware?: RequestHandler;
  authMiddleware?: RequestHandler;
  paymentGateway?: PaymentGateway;
  passwordHasher?: PasswordHasherPort;
  tokenService?: TokenServicePort;
}
