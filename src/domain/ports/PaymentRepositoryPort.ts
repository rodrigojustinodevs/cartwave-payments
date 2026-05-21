import type { Payment } from '../entities/Payment.js';

export interface PaymentRepositoryPort {
  save(payment: Payment): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByProviderTxId(providerTxId: string): Promise<Payment | null>;
  update(payment: Payment): Promise<Payment>;
}
