import { Payment, PaymentStatus } from '../entities/Payment.js';
import type { PaymentRepositoryPort } from '../ports/PaymentRepositoryPort.js';
import type { UserRepositoryPort } from '../ports/UserRepositoryPort.js';
import type { PaymentGateway } from '../ports/PaymentGateway.js';
import type { CodedError } from '../../types/errors.js';

export interface InitiatePaymentInput {
  amount: number;
  currency: string;
  method: string;
  productId: string;
  userId: string;
}

export class InitiatePaymentUseCase {
  constructor(
    private readonly paymentRepository: PaymentRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
    private readonly paymentGateway: PaymentGateway
  ) {}

  async execute({ amount, currency, method, productId, userId }: InitiatePaymentInput) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found') as CodedError;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    const payment = new Payment({ amount, currency, method, productId, userId });
    await this.paymentRepository.save(payment);

    try {
      const gatewayResponse = await this.paymentGateway.createPayment({
        amount,
        currency,
        paymentMethod: this._mapMethod(method),
        productId,
      });

      const { txId } = gatewayResponse;

      if (txId) {
        payment.attachProviderTransaction(txId);
        await this.paymentRepository.update(payment);
        console.info('[InitiatePayment] pending awaiting webhook', {
          paymentId: payment.id,
          providerTxId: payment.providerTxId,
          method: payment.method,
          userId: payment.userId,
        });
      } else {
        payment.markAsFailed();
      }
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? (error as CodedError).code : undefined;
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error initiating payment:', code ? `[${code}] ${message}` : message);
      payment.markAsFailed();
    }

    if (!payment.providerTxId || payment.status === PaymentStatus.FAILED) {
      await this.paymentRepository.update(payment);
    }

    return payment.toJSON();
  }

  private _mapMethod(method: string): string {
    const map: Record<string, string> = {
      PAYPAL: 'pay-pal',
      CREDIT_CARD: 'credit-card',
      PIX: 'pix',
    };
    return map[method] || method.toLowerCase();
  }
}
