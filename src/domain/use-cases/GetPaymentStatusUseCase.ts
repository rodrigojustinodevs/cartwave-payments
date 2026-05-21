import { UserRole } from '../entities/User.js';
import type { PaymentRepositoryPort } from '../ports/PaymentRepositoryPort.js';
import type { CodedError } from '../../types/errors.js';

export interface PaymentAuthContext {
  actorUserId: string;
  actorRole: string;
}

export class GetPaymentStatusUseCase {
  constructor(private readonly paymentRepository: PaymentRepositoryPort) {}

  async execute(paymentId: string, auth: PaymentAuthContext) {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      const error = new Error(`Payment not found: ${paymentId}`) as CodedError;
      error.code = 'PAYMENT_NOT_FOUND';
      throw error;
    }

    const isOwner = payment.userId === auth.actorUserId;
    const isAdmin = auth.actorRole === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      const err = new Error('Forbidden') as CodedError;
      err.code = 'FORBIDDEN';
      throw err;
    }

    return {
      paymentId: payment.id,
      status: payment.status,
    };
  }
}
