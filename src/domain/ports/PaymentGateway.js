'use strict';

/**
 * Port (interface) for external payment gateway HTTP communication.
 * Isolates the domain from provider URLs and payload shapes.
 */
class PaymentGateway {
  /**
   * @param {{ amount: number, currency: string, paymentMethod: string, productId: string }} payload
   * @returns {Promise<{ txId: string|null, status: string }>}
   */
  async createPayment(payload) {
    console.log('Creating payment with payload', payload);
    throw new Error('PaymentGateway.createPayment() not implemented');
  }

  /**
   * @param {string} paymentId Provider transaction / payment identifier
   * @returns {Promise<{ txId: string|null, status: string }>}
   */
  async getPaymentStatus(paymentId) {
    throw new Error('PaymentGateway.getPaymentStatus() not implemented');
  }
}

module.exports = { PaymentGateway };
