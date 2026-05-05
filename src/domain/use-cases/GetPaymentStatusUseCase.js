'use strict';

const { UserRole } = require('../entities/User');

class GetPaymentStatusUseCase {
  /**
   * @param {import('../ports/PaymentRepositoryPort').PaymentRepositoryPort} paymentRepository
   * @param {import('../ports/PaymentGateway').PaymentGateway} paymentGateway
   */
  constructor(paymentRepository, paymentGateway) {
    this.paymentRepository = paymentRepository;
    this.paymentGateway = paymentGateway;
  }

  /**
   * @param {string} paymentId
   * @param {{ actorUserId: string, actorRole: string }} auth
   * @returns {Promise<{ paymentId: string, status: string }>}
   */
  async execute(paymentId, auth) {
    const payment = await this.paymentRepository.findById(paymentId);

    if (!payment) {
      const error = new Error(`Payment not found: ${paymentId}`);
      error.code = 'PAYMENT_NOT_FOUND';
      throw error;
    }

    const isOwner = payment.userId === auth.actorUserId;
    const isAdmin = auth.actorRole === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      const err = new Error('Forbidden');
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (payment.providerTxId) {
      try {
        const gatewayResponse = await this.paymentGateway.getPaymentStatus(payment.providerTxId);

        if (gatewayResponse.status !== payment.status) {
          if (gatewayResponse.status === 'processed') {
            payment.markAsProcessed(payment.providerTxId);
          }
          await this.paymentRepository.update(payment);
        }
      } catch {
        // Gateway unavailable — return last known status from DB
      }
    }

    return {
      paymentId: payment.id,
      status: payment.status,
    };
  }
}

module.exports = { GetPaymentStatusUseCase };
