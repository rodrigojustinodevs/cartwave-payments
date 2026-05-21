import { v4 as uuidv4 } from 'uuid';
import { Money } from '../value-objects/Money.js';
import {
  InvalidPaymentStateTransitionError,
  MissingProviderTransactionIdError,
} from '../errors/PaymentErrors.js';

export const PaymentStatus = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  FAILED: 'failed',
} as const;

export type PaymentStatusType = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentMethod = {
  PAYPAL: 'PAYPAL',
  CREDIT_CARD: 'CREDIT_CARD',
  PIX: 'PIX',
} as const;

export type PaymentMethodType = (typeof PaymentMethod)[keyof typeof PaymentMethod];

const ALLOWED_TRANSITIONS: Record<PaymentStatusType, Set<PaymentStatusType>> = {
  [PaymentStatus.PENDING]: new Set([PaymentStatus.PROCESSED, PaymentStatus.FAILED]),
  [PaymentStatus.PROCESSED]: new Set(),
  [PaymentStatus.FAILED]: new Set(),
};

export interface PaymentProps {
  id?: string;
  userId: string;
  amount: number;
  currency: string;
  method: string;
  productId: string;
  status?: PaymentStatusType;
  providerTxId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Payment {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _money: Money;
  private readonly _method: string;
  private readonly _productId: string;
  private _status: PaymentStatusType;
  private _providerTxId: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor({
    id,
    userId,
    amount,
    currency,
    method,
    productId,
    status,
    providerTxId,
    createdAt,
    updatedAt,
  }: PaymentProps) {
    this._validateRequiredFields({ userId, amount, currency, method, productId });

    this._id = id || uuidv4();
    this._userId = userId;
    this._money = new Money(amount, currency);
    this._method = method;
    this._productId = productId;
    this._status = status || PaymentStatus.PENDING;
    this._providerTxId = providerTxId ?? null;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();

    this._validateStatus();
  }

  get id(): string {
    return this._id;
  }
  get userId(): string {
    return this._userId;
  }
  get amount(): number {
    return this._money.amount;
  }
  get currency(): string {
    return this._money.currency;
  }
  get money(): Money {
    return this._money;
  }
  get method(): string {
    return this._method;
  }
  get productId(): string {
    return this._productId;
  }
  get status(): PaymentStatusType {
    return this._status;
  }
  get providerTxId(): string | null {
    return this._providerTxId;
  }
  get createdAt(): Date {
    return this._createdAt;
  }
  get updatedAt(): Date {
    return this._updatedAt;
  }

  isPending(): boolean {
    return this._status === PaymentStatus.PENDING;
  }

  isProcessed(): boolean {
    return this._status === PaymentStatus.PROCESSED;
  }

  isFailed(): boolean {
    return this._status === PaymentStatus.FAILED;
  }

  isTerminal(): boolean {
    return this.isProcessed() || this.isFailed();
  }

  attachProviderTransaction(providerTxId: string): this {
    if (typeof providerTxId !== 'string' || providerTxId.length === 0) {
      throw new Error('providerTxId must be a non-empty string');
    }
    if (this.isTerminal()) {
      throw new InvalidPaymentStateTransitionError(this._status, this._status, this._id);
    }
    this._providerTxId = providerTxId;
    this._touch();
    return this;
  }

  markAsProcessed(providerTxId: string): this {
    if (this._status === PaymentStatus.PROCESSED) {
      return this;
    }
    this._assertCanTransitionTo(PaymentStatus.PROCESSED);
    if (typeof providerTxId !== 'string' || providerTxId.length === 0) {
      throw new MissingProviderTransactionIdError();
    }
    this._status = PaymentStatus.PROCESSED;
    this._providerTxId = providerTxId;
    this._touch();
    return this;
  }

  markAsFailed(): this {
    if (this._status === PaymentStatus.FAILED) {
      return this;
    }
    this._assertCanTransitionTo(PaymentStatus.FAILED);
    this._status = PaymentStatus.FAILED;
    this._touch();
    return this;
  }

  toJSON(): { paymentId: string; status: PaymentStatusType } {
    return {
      paymentId: this._id,
      status: this._status,
    };
  }

  private _validateRequiredFields({
    userId,
    amount,
    currency,
    method,
    productId,
  }: {
    userId: string;
    amount: number;
    currency: string;
    method: string;
    productId: string;
  }): void {
    if (!userId) {
      throw new Error('Payment userId is required');
    }
    if (amount === undefined || amount === null || typeof amount !== 'number' || amount <= 0) {
      throw new Error('Payment amount must be a positive number');
    }
    if (!currency || typeof currency !== 'string') {
      throw new Error('Payment currency is required');
    }
    if (!method) {
      throw new Error('Payment method is required');
    }
    if (!productId) {
      throw new Error('Product ID is required');
    }
  }

  private _validateStatus(): void {
    if (!Object.values(PaymentStatus).includes(this._status)) {
      throw new Error(`Invalid payment status: ${this._status}`);
    }
  }

  private _assertCanTransitionTo(target: PaymentStatusType): void {
    const allowed = ALLOWED_TRANSITIONS[this._status];
    if (!allowed || !allowed.has(target)) {
      throw new InvalidPaymentStateTransitionError(this._status, target, this._id);
    }
  }

  private _touch(): void {
    this._updatedAt = new Date();
  }
}
