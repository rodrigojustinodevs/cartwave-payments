'use strict';

const { Payment, PaymentStatus } = require('../entities/Payment');

class InitiatePaymentUseCase {
  /**
   * @param {import('../ports/PaymentRepositoryPort').PaymentRepositoryPort} paymentRepository
   * @param {import('../ports/UserRepositoryPort').UserRepositoryPort} userRepository
   * @param {import('../ports/PaymentGateway').PaymentGateway} paymentGateway
   */
  constructor(paymentRepository, userRepository, paymentGateway) {
    this.paymentRepository = paymentRepository;
    this.userRepository = userRepository;
    this.paymentGateway = paymentGateway;
  }

  /**
   * Com sucesso no gateway e `tx_id`, o pagamento fica **pending** até o webhook
   * (`payment.approved` / `payment.refused`) atualizar o estado definitivo.
   *
   * @param {{ amount: number, currency: string, method: string, productId: string, userId: string }} input
   * @returns {Promise<{ paymentId: string, status: string }>}
   */
  async execute({ amount, currency, method, productId, userId }) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      const err = new Error('User not found');
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
        payment.providerTxId = txId;
        payment.status = PaymentStatus.PENDING;
        payment.updatedAt = new Date();
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
      const code = error && error.code;
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        'Error initiating payment:',
        code ? `[${code}] ${message}` : message
      );
      payment.markAsFailed();
    }

    if (!payment.providerTxId || payment.status === PaymentStatus.FAILED) {
      await this.paymentRepository.update(payment);
    }

    return payment.toJSON();
  }

  _mapMethod(method) {
    const map = {
      PAYPAL: 'pay-pal',
      CREDIT_CARD: 'credit-card',
      PIX: 'pix',
    };
    return map[method] || method.toLowerCase();
  }
}

module.exports = { InitiatePaymentUseCase };
