import { Payment, PaymentStatus, type PaymentProps } from '../../../src/domain/entities/Payment.js';
import {
  InvalidPaymentStateTransitionError,
  MissingProviderTransactionIdError,
} from '../../../src/domain/errors/PaymentErrors.js';

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

  describe('Money integration', () => {
    it('expõe um Money imutável via getter `money`', () => {
      const payment = new Payment(validProps);
      expect(payment.money.amount).toBe(3452);
      expect(payment.money.currency).toBe('BRL');
      expect(Object.isFrozen(payment.money)).toBe(true);
    });

    it('rejeita amount com mais de 2 casas decimais (delegado ao Money)', () => {
      expect(() => new Payment({ ...validProps, amount: 10.123 })).toThrow(
        /at most 2 decimal places/
      );
    });
  });

  describe('encapsulamento', () => {
    it('status não pode ser mutado por atribuição direta', () => {
      const payment = new Payment(validProps);
      expect(() => {
        (payment as unknown as { status: string }).status = PaymentStatus.PROCESSED;
      }).toThrow(TypeError);
      expect(payment.status).toBe(PaymentStatus.PENDING);
    });

    it('providerTxId não pode ser mutado por atribuição direta', () => {
      const payment = new Payment(validProps);
      expect(() => {
        (payment as unknown as { providerTxId: string }).providerTxId = 'tx-direct';
      }).toThrow(TypeError);
      expect(payment.providerTxId).toBeNull();
    });
  });

  describe('attachProviderTransaction', () => {
    it('associa providerTxId mantendo status PENDING e atualiza updatedAt', () => {
      const payment = new Payment(validProps);
      const before = payment.updatedAt;
      payment.attachProviderTransaction('tx-from-gateway');

      expect(payment.providerTxId).toBe('tx-from-gateway');
      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(payment.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('rejeita providerTxId vazio ou não-string', () => {
      const payment = new Payment(validProps);
      expect(() => payment.attachProviderTransaction('')).toThrow(/non-empty string/);
      expect(() => payment.attachProviderTransaction(null)).toThrow(/non-empty string/);
      expect(() => payment.attachProviderTransaction(123 as unknown as string)).toThrow(/non-empty string/);
    });

    it('rejeita anexar txId após estado terminal', () => {
      const payment = new Payment(validProps);
      payment.markAsProcessed('tx-1');
      expect(() => payment.attachProviderTransaction('tx-2')).toThrow(
        InvalidPaymentStateTransitionError
      );
    });
  });

  describe('máquina de estados', () => {
    it('PENDING -> PROCESSED via markAsProcessed', () => {
      const payment = new Payment(validProps);
      payment.markAsProcessed('tx-ok');
      expect(payment.status).toBe(PaymentStatus.PROCESSED);
      expect(payment.providerTxId).toBe('tx-ok');
    });

    it('PENDING -> FAILED via markAsFailed', () => {
      const payment = new Payment(validProps);
      payment.markAsFailed();
      expect(payment.status).toBe(PaymentStatus.FAILED);
    });

    it('markAsProcessed exige providerTxId não vazio', () => {
      const payment = new Payment(validProps);
      expect(() => payment.markAsProcessed('')).toThrow(MissingProviderTransactionIdError);
      expect(() => payment.markAsProcessed(null)).toThrow(MissingProviderTransactionIdError);
    });

    it('PROCESSED é terminal: markAsFailed lança InvalidPaymentStateTransitionError', () => {
      const payment = new Payment(validProps);
      payment.markAsProcessed('tx-ok');
      expect(() => payment.markAsFailed()).toThrow(InvalidPaymentStateTransitionError);
    });

    it('FAILED é terminal: markAsProcessed lança InvalidPaymentStateTransitionError', () => {
      const payment = new Payment(validProps);
      payment.markAsFailed();
      expect(() => payment.markAsProcessed('tx-ok')).toThrow(InvalidPaymentStateTransitionError);
    });

    it('idempotência: markAsProcessed em PROCESSED é no-op', () => {
      const payment = new Payment(validProps);
      payment.markAsProcessed('tx-1');
      const t1 = payment.updatedAt.getTime();
      payment.markAsProcessed('tx-2');
      expect(payment.status).toBe(PaymentStatus.PROCESSED);
      expect(payment.providerTxId).toBe('tx-1');
      expect(payment.updatedAt.getTime()).toBe(t1);
    });

    it('idempotência: markAsFailed em FAILED é no-op', () => {
      const payment = new Payment(validProps);
      payment.markAsFailed();
      const t1 = payment.updatedAt.getTime();
      payment.markAsFailed();
      expect(payment.status).toBe(PaymentStatus.FAILED);
      expect(payment.updatedAt.getTime()).toBe(t1);
    });

    it('isPending / isProcessed / isFailed / isTerminal refletem o estado', () => {
      const payment = new Payment(validProps);
      expect(payment.isPending()).toBe(true);
      expect(payment.isTerminal()).toBe(false);
      payment.markAsProcessed('tx-ok');
      expect(payment.isProcessed()).toBe(true);
      expect(payment.isTerminal()).toBe(true);
    });

    it('rejeita status inválido no construtor', () => {
      expect(
        () => new Payment({ ...validProps, status: 'weird-state' } as PaymentProps)
      ).toThrow(/Invalid payment status/);
    });
  });
});
