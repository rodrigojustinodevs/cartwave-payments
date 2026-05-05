'use strict';

const { PrismaClientKnownRequestError } = require('@prisma/client-runtime-utils');
const { Payment } = require('../../../domain/entities/Payment');
const { PaymentRepositoryPort } = require('../../../domain/ports/PaymentRepositoryPort');

class PrismaPaymentRepository extends PaymentRepositoryPort {
  /**
   * @param {import('@prisma/client').PrismaClient} prisma
   */
  constructor(prisma) {
    super();
    this.prisma = prisma;
  }

  async save(payment) {
    try {
      const row = await this.prisma.payment.create({
        data: {
          id: payment.id,
          userId: payment.userId,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          productId: payment.productId,
          status: payment.status,
          providerTxId: payment.providerTxId,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
        },
      });
      return this._mapRow(row);
    } catch (e) {
      this._rethrowPrisma(e);
    }
  }

  async findById(id) {
    const row = await this.prisma.payment.findUnique({ where: { id } });
    if (!row) return null;
    return this._mapRow(row);
  }

  async findByProviderTxId(providerTxId) {
    const row = await this.prisma.payment.findFirst({
      where: { providerTxId },
    });
    if (!row) return null;
    return this._mapRow(row);
  }

  async update(payment) {
    try {
      const row = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: payment.status,
          providerTxId: payment.providerTxId,
          updatedAt: new Date(),
        },
      });
      return this._mapRow(row);
    } catch (e) {
      this._rethrowPrisma(e);
    }
  }

  _mapRow(row) {
    return new Payment({
      id: row.id,
      userId: row.userId,
      amount: Number(row.amount),
      currency: row.currency,
      method: row.method,
      productId: row.productId,
      status: row.status,
      providerTxId: row.providerTxId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  _rethrowPrisma(e) {
    if (e instanceof PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        throw new Error('Unique constraint violation');
      }
      if (e.code === 'P2003') {
        throw new Error('Foreign key constraint violation');
      }
    }
    throw e;
  }
}

module.exports = { PrismaPaymentRepository };
