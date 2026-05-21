import { PaymentStatus } from '../entities/Payment.js';
import type { PaymentRepositoryPort } from '../ports/PaymentRepositoryPort.js';

export interface WebhookPayload {
  event: string;
  data: Record<string, unknown>;
}

export class PaymentWebhookService {
  constructor(private readonly paymentRepository: PaymentRepositoryPort) {}

  async execute({ event, data }: WebhookPayload): Promise<void> {
    const providerTxId = this._extractProviderTxId(data);
    if (!providerTxId) {
      return;
    }
    const payment = await this.paymentRepository.findByProviderTxId(providerTxId);
    if (!payment) {
      console.warn(`[PaymentWebhook] Payment not found for provider_tx_id=${providerTxId}`);
      return;
    }

    if (payment.isTerminal()) {
      return;
    }

    const targetStatus = this._mapEventToDomainStatus(event);
    if (targetStatus === null) {
      console.warn(`[PaymentWebhook] Unknown event type: ${event}`);
      return;
    }

    if (targetStatus === PaymentStatus.PENDING) {
      return;
    }

    if (targetStatus === PaymentStatus.PROCESSED) {
      payment.markAsProcessed(payment.providerTxId || providerTxId);
    } else {
      payment.markAsFailed();
    }

    await this.paymentRepository.update(payment);
  }

  private _extractProviderTxId(data: Record<string, unknown> | undefined | null): string | null {
    if (!data || typeof data !== 'object') {
      return null;
    }
    const tx = data.tx_id ?? data.id;
    return typeof tx === 'string' && tx.length > 0 ? tx : null;
  }

  private _mapEventToDomainStatus(event: string): (typeof PaymentStatus)[keyof typeof PaymentStatus] | null {
    switch (event) {
      case 'payment.approved':
        return PaymentStatus.PROCESSED;
      case 'payment.refused':
        return PaymentStatus.FAILED;
      case 'payment.pending':
        return PaymentStatus.PENDING;
      default:
        return null;
    }
  }
}
