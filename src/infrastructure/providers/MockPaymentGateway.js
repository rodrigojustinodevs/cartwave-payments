'use strict';

const axios = require('axios');
const { PaymentGateway } = require('../../domain/ports/PaymentGateway');

class MockPaymentGateway extends PaymentGateway {
  /**
   * @param {string} [baseURL] Base URL do provedor (Mocks Server em dev/testes)
   */
  constructor(baseURL) {
    super();
    const resolved =
      baseURL ||
      process.env.PAYMENT_PROVIDER_URL ||
      process.env.PAYMENT_PROVIDER_BASE_URL ||
      'http://localhost:3110';
    this.client = axios.create({
      baseURL: resolved,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000,
    });
  }

  /**
   * @param {{ amount: number, currency: string, paymentMethod: string, productId: string }} payload
   */
  async createPayment({ amount, currency, paymentMethod, productId }) {
    try {
      const response = await this.client.post('/payments', {
        money: { amount, currency },
        payment_method: paymentMethod,
        product_id: productId,
      });
      return this._mapResponse(response.data);
    } catch (err) {
      throw this._toGatewayError(err);
    }
  }

  /**
   * @param {string} paymentId
   */
  async getPaymentStatus(paymentId) {
    try {
      const response = await this.client.get(`/payments/${paymentId}`);
      return this._mapResponse(response.data);
    } catch (err) {
      throw this._toGatewayError(err);
    }
  }

  /**
   * @param {unknown} err
   * @returns {Error}
   */
  _toGatewayError(err) {
    if (axios.isAxiosError(err)) {
      const netCode = err.code || (err.cause && err.cause.code);
      if (
        netCode === 'ECONNREFUSED' ||
        netCode === 'ENOTFOUND' ||
        netCode === 'ETIMEDOUT' ||
        netCode === 'ECONNABORTED'
      ) {
        const e = new Error('Payment provider is unreachable');
        e.code = 'GATEWAY_UNAVAILABLE';
        return e;
      }
      if (err.response) {
        const e = new Error(
          typeof err.response.data === 'object' && err.response.data && 'message' in err.response.data
            ? String(err.response.data.message)
            : `Payment provider error (HTTP ${err.response.status})`
        );
        e.code = 'GATEWAY_HTTP_ERROR';
        e.status = err.response.status;
        return e;
      }
    }
    if (err instanceof Error) {
      return err;
    }
    return new Error(String(err));
  }
  
  _mapResponse(data) {
    const txId = data.tx_id ?? data.id ?? null;
    const status = typeof data.status === 'string' ? data.status : '';
    return { txId, status };
  }
}

module.exports = { MockPaymentGateway };
