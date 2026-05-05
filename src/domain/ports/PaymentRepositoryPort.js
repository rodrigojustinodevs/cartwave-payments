'use strict';

/**
 * Port (interface) for Payment Repository
 * Defines the contract that any storage adapter must fulfill.
 * Part of the hexagonal architecture — domain does not depend on infrastructure.
 */
class PaymentRepositoryPort {
  /**
   * @param {import('../entities/Payment').Payment} payment
   * @returns {Promise<import('../entities/Payment').Payment>}
   */
  async save(payment) {
    throw new Error('PaymentRepositoryPort.save() not implemented');
  }

  /**
   * @param {string} id
   * @returns {Promise<import('../entities/Payment').Payment|null>}
   */
  async findById(id) {
    throw new Error('PaymentRepositoryPort.findById() not implemented');
  }

  /**
   * @param {string} providerTxId
   * @returns {Promise<import('../entities/Payment').Payment|null>}
   */
  async findByProviderTxId(providerTxId) {
    throw new Error('PaymentRepositoryPort.findByProviderTxId() not implemented');
  }

  /**
   * @param {import('../entities/Payment').Payment} payment
   * @returns {Promise<import('../entities/Payment').Payment>}
   */
  async update(payment) {
    throw new Error('PaymentRepositoryPort.update() not implemented');
  }
}

module.exports = { PaymentRepositoryPort };
