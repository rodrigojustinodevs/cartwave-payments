import { UserRole } from '../entities/User.js';
import type { PaymentRepositoryPort } from '../ports/PaymentRepositoryPort.js';
import type { CodedError } from '../../types/errors.js';

type UserRole = 'user' | 'admin';
export interface PaymentAuthContext {
  actorUserId: string;
  actorRole: UserRole;
}

export interface GetPaymentStatusOutput {
  paymentId: string;
  status: string;
}

export class GetPaymentStatusUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepositoryPort,
  ) {}

  async execute(
    paymentId: string,
    auth: PaymentAuthContext,
  ): Promise<GetPaymentStatusOutput> {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      const error = new Error(`Payment not found: ${paymentId}`) as CodedError;
      error.code = 'PAYMENT_NOT_FOUND';
      throw error;
    }

    const isOwner = payment.userId === auth.actorUserId;
    const isAdmin = auth.actorRole === UserRole.ADMIN;

    if (!isOwner && !isAdmin) {
      const error = new Error('Forbidden') as CodedError;
      error.code = 'FORBIDDEN';
      throw error;
    }

    return {
      paymentId: payment.id,
      status: payment.status,
    };
  }
}