'use strict';

const nock = require('nock');
const { MockPaymentGateway } = require('../../src/infrastructure/providers/MockPaymentGateway');

const BASE_URL = 'http://gateway.test';

describe('MockPaymentGateway Integration Tests', () => {
  let gateway;

  beforeEach(() => {
    nock.cleanAll();
    gateway = new MockPaymentGateway(BASE_URL);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('createPayment()', () => {
    it('should POST to /payments with correct payload and return txId + status', async () => {
      nock(BASE_URL).post('/payments').reply(201, {
        tx_id: 'b018b23b-9931-4438-b55f-782edb05b4c2',
        status: 'processed',
      });

      const result = await gateway.createPayment({
        amount: 3452,
        currency: 'BRL',
        paymentMethod: 'pay-pal',
        productId: '87e9646a-8513-465b-b58d-6df44b9e4925',
      });

      expect(result).toEqual({
        txId: 'b018b23b-9931-4438-b55f-782edb05b4c2',
        status: 'processed',
      });
    });

    it('should throw when gateway returns a non-2xx status', async () => {
      nock(BASE_URL).post('/payments').reply(500, { message: 'Internal error' });

      await expect(
        gateway.createPayment({ amount: 100, currency: 'BRL', paymentMethod: 'pay-pal', productId: 'x' })
      ).rejects.toThrow();
    });

    it('should throw on network error', async () => {
      nock(BASE_URL).post('/payments').replyWithError('ECONNREFUSED');

      await expect(
        gateway.createPayment({ amount: 100, currency: 'BRL', paymentMethod: 'pay-pal', productId: 'x' })
      ).rejects.toThrow();
    });
  });

  describe('getPaymentStatus()', () => {
    it('should GET /payments/:id and return txId + status', async () => {
      nock(BASE_URL)
        .get('/payments/b018b23b-9931-4438-b55f-782edb05b4c2')
        .reply(200, {
          tx_id: 'b018b23b-9931-4438-b55f-782edb05b4c2',
          status: 'processed',
        });

      const result = await gateway.getPaymentStatus('b018b23b-9931-4438-b55f-782edb05b4c2');

      expect(result).toEqual({
        txId: 'b018b23b-9931-4438-b55f-782edb05b4c2',
        status: 'processed',
      });
    });

    it('should map id when tx_id is absent', async () => {
      nock(BASE_URL).get('/payments/only-id').reply(200, {
        id: 'only-id',
        status: 'processed',
      });

      const result = await gateway.getPaymentStatus('only-id');

      expect(result.txId).toBe('only-id');
      expect(result.status).toBe('processed');
    });
  });
});
