'use strict';

const { PaymentStatus } = require('../entities/Payment');

class PaymentWebhookService {
  /**
   * @param {import('../ports/PaymentRepositoryPort').PaymentRepositoryPort} paymentRepository
   */
  constructor(paymentRepository) {
    this.paymentRepository = paymentRepository;
  }

  /**
   * @param {{ event: string, data: Record<string, unknown> }} payload
   * @returns {Promise<void>}
   */
  async execute({ event, data }) {
    const providerTxId = this._extractProviderTxId(data);
    if (!providerTxId) {
      return;
    }
    const payment = await this.paymentRepository.findByProviderTxId(providerTxId);
    if (!payment) {
      console.warn(`[PaymentWebhook] Payment not found for provider_tx_id=${providerTxId}`);
      return;
    }

    if (payment.isTerminal()) {
      return;
    }

    const targetStatus = this._mapEventToDomainStatus(event);
    if (targetStatus === null) {
      console.warn(`[PaymentWebhook] Unknown event type: ${event}`);
      return;
    }

    // payment.pending sobre um pagamento já PENDING é um no-op idempotente.
    if (targetStatus === PaymentStatus.PENDING) {
      return;
    }

    if (targetStatus === PaymentStatus.PROCESSED) {
      payment.markAsProcessed(payment.providerTxId || providerTxId);
    } else {
      payment.markAsFailed();
    }

    await this.paymentRepository.update(payment);
  }

  /**
   * @param {Record<string, unknown>|undefined|null} data
   * @returns {string|null}
   */
  _extractProviderTxId(data) {
    if (!data || typeof data !== 'object') {
      return null;
    }
    const tx = data.tx_id ?? data.id;
    return typeof tx === 'string' && tx.length > 0 ? tx : null;
  }

  /**
   * @param {string} event
   * @returns {'pending'|'processed'|'failed'|null}
   */
  _mapEventToDomainStatus(event) {
    switch (event) {
      case 'payment.approved':
        return PaymentStatus.PROCESSED;
      case 'payment.refused':
        return PaymentStatus.FAILED;
      case 'payment.pending':
        return PaymentStatus.PENDING;
      default:
        return null;
    }
  }
}

module.exports = { PaymentWebhookService };
