'use strict';

const { PrismaClientKnownRequestError } = require('@prisma/client-runtime-utils');
const { PrismaPaymentRepository } = require('../../../src/infrastructure/database/repositories/PrismaPaymentRepository');
const { Payment, PaymentStatus } = require('../../../src/domain/entities/Payment');

function makePrisma(rowOverride = {}) {
  const defaultRow = {
    id: 'pay-001',
    userId: '11111111-1111-4111-8111-111111111111',
    amount: 3452,
    currency: 'BRL',
    method: 'PAYPAL',
    productId: 'prod-123',
    status: 'pending',
    providerTxId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...rowOverride,
  };
  return {
    payment: {
      create: jest.fn().mockResolvedValue(defaultRow),
      findUnique: jest.fn().mockResolvedValue(defaultRow),
      findFirst: jest.fn().mockResolvedValue(defaultRow),
      update: jest.fn().mockResolvedValue(defaultRow),
    },
  };
}

const makePayment = (overrides = {}) =>
  new Payment({
    id: 'pay-001',
    userId: '11111111-1111-4111-8111-111111111111',
    amount: 3452,
    currency: 'BRL',
    method: 'PAYPAL',
    productId: 'prod-123',
    ...overrides,
  });

describe('PrismaPaymentRepository (unit)', () => {
  describe('save()', () => {
    it('deve chamar payment.create e devolver Payment', async () => {
      const prisma = makePrisma();
      const repo = new PrismaPaymentRepository(prisma);
      const payment = makePayment();

      const result = await repo.save(payment);

      expect(prisma.payment.create).toHaveBeenCalledTimes(1);
      expect(prisma.payment.create.mock.calls[0][0].data.id).toBe(payment.id);
      expect(result).toBeInstanceOf(Payment);
    });
  });

  describe('findById()', () => {
    it('deve devolver Payment quando encontrado', async () => {
      const prisma = makePrisma();
      const repo = new PrismaPaymentRepository(prisma);

      const result = await repo.findById('pay-001');

      expect(prisma.payment.findUnique).toHaveBeenCalledWith({ where: { id: 'pay-001' } });
      expect(result).toBeInstanceOf(Payment);
      expect(result.id).toBe('pay-001');
    });

    it('deve devolver null quando não há linha', async () => {
      const prisma = {
        payment: { findUnique: jest.fn().mockResolvedValue(null) },
      };
      const repo = new PrismaPaymentRepository(prisma);

      const result = await repo.findById('missing');

      expect(result).toBeNull();
    });
  });

  describe('findByProviderTxId()', () => {
    it('deve chamar findFirst e devolver Payment', async () => {
      const prisma = makePrisma();
      const repo = new PrismaPaymentRepository(prisma);

      const result = await repo.findByProviderTxId('tx-abc');

      expect(prisma.payment.findFirst).toHaveBeenCalledWith({ where: { providerTxId: 'tx-abc' } });
      expect(result).toBeInstanceOf(Payment);
    });

    it('deve devolver null quando não há linha', async () => {
      const prisma = {
        payment: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      const repo = new PrismaPaymentRepository(prisma);

      const result = await repo.findByProviderTxId('missing-tx');

      expect(result).toBeNull();
    });
  });

  describe('update()', () => {
    it('deve chamar payment.update e devolver Payment', async () => {
      const prisma = makePrisma({ status: 'processed', providerTxId: 'tx-abc' });
      const repo = new PrismaPaymentRepository(prisma);
      const payment = makePayment();
      payment.markAsProcessed('tx-abc');

      const result = await repo.update(payment);

      expect(prisma.payment.update).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(Payment);
    });
  });

  describe('_mapRow()', () => {
    it('deve mapear colunas para a entidade Payment', async () => {
      const prisma = makePrisma({
        id: 'abc-123',
        userId: '22222222-2222-4222-8222-222222222222',
        amount: 999.99,
        currency: 'USD',
        method: 'PIX',
        productId: 'prod-xyz',
        status: 'processed',
        providerTxId: 'tx-9999',
      });
      const repo = new PrismaPaymentRepository(prisma);

      const result = await repo.findById('abc-123');

      expect(result.id).toBe('abc-123');
      expect(result.userId).toBe('22222222-2222-4222-8222-222222222222');
      expect(result.amount).toBe(999.99);
      expect(result.currency).toBe('USD');
      expect(result.method).toBe('PIX');
      expect(result.productId).toBe('prod-xyz');
      expect(result.status).toBe(PaymentStatus.PROCESSED);
      expect(result.providerTxId).toBe('tx-9999');
    });
  });

  describe('tratamento de erros Prisma', () => {
    function p2002() {
      return new PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['id'] },
      });
    }
    function p2003() {
      return new PrismaClientKnownRequestError('fk', {
        code: 'P2003',
        clientVersion: 'test',
        meta: {},
      });
    }

    it('save deve mapear P2002', async () => {
      const prisma = {
        payment: { create: jest.fn().mockRejectedValue(p2002()) },
      };
      const repo = new PrismaPaymentRepository(prisma);
      await expect(repo.save(makePayment())).rejects.toThrow('Unique constraint violation');
    });

    it('save deve mapear P2003', async () => {
      const prisma = {
        payment: { create: jest.fn().mockRejectedValue(p2003()) },
      };
      const repo = new PrismaPaymentRepository(prisma);
      await expect(repo.save(makePayment())).rejects.toThrow('Foreign key constraint violation');
    });

    it('save deve propagar erro genérico', async () => {
      const prisma = {
        payment: { create: jest.fn().mockRejectedValue(new Error('outro')) },
      };
      const repo = new PrismaPaymentRepository(prisma);
      await expect(repo.save(makePayment())).rejects.toThrow('outro');
    });

    it('update deve mapear P2002', async () => {
      const prisma = {
        payment: { update: jest.fn().mockRejectedValue(p2002()) },
      };
      const repo = new PrismaPaymentRepository(prisma);
      const payment = makePayment();
      payment.markAsProcessed('tx');
      await expect(repo.update(payment)).rejects.toThrow('Unique constraint violation');
    });
  });
});
