export class DomainError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class InvalidPaymentStateTransitionError extends DomainError {
  readonly from: string;
  readonly to: string;
  readonly paymentId?: string;

  constructor(from: string, to: string, paymentId?: string) {
    super(
      `Invalid payment state transition: ${from} -> ${to}` +
        (paymentId ? ` (payment ${paymentId})` : ''),
      'INVALID_PAYMENT_STATE_TRANSITION'
    );
    this.from = from;
    this.to = to;
    this.paymentId = paymentId;
  }
}

export class MissingProviderTransactionIdError extends DomainError {
  constructor() {
    super(
      'A providerTxId is required to mark a payment as processed',
      'MISSING_PROVIDER_TX_ID'
    );
  }
}
