'use strict';

const { Payment, PaymentStatus } = require('../../../src/domain/entities/Payment');

describe('Payment Entity', () => {
  const validProps = {
    userId: '11111111-1111-4111-8111-111111111111',
    amount: 3452,
    currency: 'BRL',
    method: 'PAYPAL',
    productId: '87e9646a-8513-465b-b58d-6df44b9e4925',
  };

  describe('constructor', () => {
    it('should create a payment with valid properties', () => {
      const payment = new Payment(validProps);

      expect(payment.id).toBeDefined();
      expect(payment.amount).toBe(3452);
      expect(payment.currency).toBe('BRL');
      expect(payment.method).toBe('PAYPAL');
      expect(payment.productId).toBe('87e9646a-8513-465b-b58d-6df44b9e4925');
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.providerTxId).toBeNull();
      expect(payment.createdAt).toBeInstanceOf(Date);
    });

    it('should use provided id if given', () => {
      const payment = new Payment({ ...validProps, id: 'custom-id' });
      expect(payment.id).toBe('custom-id');
    });

    it('should throw if amount is missing', () => {
      expect(() => new Payment({ ...validProps, amount: undefined })).toThrow('amount must be a positive number');
    });

    it('should throw if amount is zero', () => {
      expect(() => new Payment({ ...validProps, amount: 0 })).toThrow('amount must be a positive number');
    });

    it('should throw if amount is negative', () => {
      expect(() => new Payment({ ...validProps, amount: -10 })).toThrow('amount must be a positive number');
    });

    it('should throw if currency is missing', () => {
      expect(() => new Payment({ ...validProps, currency: undefined })).toThrow('currency is required');
    });

    it('should throw if method is missing', () => {
      expect(() => new Payment({ ...validProps, method: undefined })).toThrow('method is required');
    });

    it('should throw if productId is missing', () => {
      expect(() => new Payment({ ...validProps, productId: undefined })).toThrow('Product ID is required');
    });

    it('should throw if userId is missing', () => {
      expect(() => new Payment({ ...validProps, userId: undefined })).toThrow('Payment userId is required');
    });
  });

  describe('markAsProcessed', () => {
    it('should update status to processed and set providerTxId', () => {
      const payment = new Payment(validProps);
      payment.markAsProcessed('tx-abc-123');

      expect(payment.status).toBe(PaymentStatus.PROCESSED);
      expect(payment.providerTxId).toBe('tx-abc-123');
    });
  });

  describe('markAsFailed', () => {
    it('should update status to failed', () => {
      const payment = new Payment(validProps);
      payment.markAsFailed();

      expect(payment.status).toBe(PaymentStatus.FAILED);
    });
  });

  describe('toJSON', () => {
    it('should return paymentId and status', () => {
      const payment = new Payment(validProps);
      const json = payment.toJSON();

      expect(json).toEqual({
        paymentId: payment.id,
        status: PaymentStatus.PENDING,
      });
    });
  });
});
