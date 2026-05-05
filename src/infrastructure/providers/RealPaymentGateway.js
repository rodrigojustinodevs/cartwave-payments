'use strict';

const { PaymentGateway } = require('../../domain/ports/PaymentGateway');

/** Esqueleto para integração futura com gateway real (produção). */
class RealPaymentGateway extends PaymentGateway {
  async createPayment() {
    throw new Error('RealPaymentGateway not implemented yet');
  }

  async getPaymentStatus() {
    throw new Error('RealPaymentGateway not implemented yet');
  }
}

module.exports = { RealPaymentGateway };
