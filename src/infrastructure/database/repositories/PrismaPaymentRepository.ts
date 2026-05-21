import { PrismaClientKnownRequestError } from '@prisma/client-runtime-utils';
import type { PrismaClient } from '@prisma/client';
import { Payment } from '../../../domain/entities/Payment.js';
import type { PaymentRepositoryPort } from '../../../domain/ports/PaymentRepositoryPort.js';

export class PrismaPaymentRepository implements PaymentRepositoryPort {
  constructor(private readonly prisma: PrismaClient) {}

  async save(payment: Payment): Promise<Payment> {
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

  async findById(id: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findUnique({ where: { id } });
    if (!row) return null;
    return this._mapRow(row);
  }

  async findByProviderTxId(providerTxId: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findFirst({
      where: { providerTxId },
    });
    if (!row) return null;
    return this._mapRow(row);
  }

  async update(payment: Payment): Promise<Payment> {
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

  private _mapRow(row: {
    id: string;
    userId: string | null;
    amount: { toString(): string } | number | string;
    currency: string;
    method: string;
    productId: string;
    status: string;
    providerTxId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Payment {
    return new Payment({
      id: row.id,
      userId: row.userId!,
      amount: Number(row.amount),
      currency: row.currency,
      method: row.method,
      productId: row.productId,
      status: row.status as Payment['status'],
      providerTxId: row.providerTxId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  private _rethrowPrisma(e: unknown): never {
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
