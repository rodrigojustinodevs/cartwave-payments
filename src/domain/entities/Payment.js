'use strict';

const { v4: uuidv4 } = require('uuid');
const { Money } = require('../value-objects/Money');
const {
  InvalidPaymentStateTransitionError,
  MissingProviderTransactionIdError,
} = require('../errors/PaymentErrors');

const PaymentStatus = Object.freeze({
  PENDING: 'pending',
  PROCESSED: 'processed',
  FAILED: 'failed',
});

const PaymentMethod = Object.freeze({
  PAYPAL: 'PAYPAL',
  CREDIT_CARD: 'CREDIT_CARD',
  PIX: 'PIX',
});

const ALLOWED_TRANSITIONS = Object.freeze({
  [PaymentStatus.PENDING]: new Set([PaymentStatus.PROCESSED, PaymentStatus.FAILED]),
  [PaymentStatus.PROCESSED]: new Set(),
  [PaymentStatus.FAILED]: new Set(),
});

class Payment {
  /**
   * @param {object} props
   * @param {string} [props.id]
   * @param {string} props.userId
   * @param {number} props.amount
   * @param {string} props.currency
   * @param {string} props.method
   * @param {string} props.productId
   * @param {string} [props.status]
   * @param {string|null} [props.providerTxId]
   * @param {Date} [props.createdAt]
   * @param {Date} [props.updatedAt]
   */
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
  }) {
    this._validateRequiredFields({ userId, amount, currency, method, productId });

    /** @private */
    this._id = id || uuidv4();
    /** @private */
    this._userId = userId;
    /** @private */
    this._money = new Money(amount, currency);
    /** @private */
    this._method = method;
    /** @private */
    this._productId = productId;
    /** @private */
    this._status = status || PaymentStatus.PENDING;
    /** @private */
    this._providerTxId = providerTxId || null;
    /** @private */
    this._createdAt = createdAt || new Date();
    /** @private */
    this._updatedAt = updatedAt || new Date();

    this._validateStatus();
  }


  get id() {
    return this._id;
  }
  get userId() {
    return this._userId;
  }
  get amount() {
    return this._money.amount;
  }
  get currency() {
    return this._money.currency;
  }
  get money() {
    return this._money;
  }
  get method() {
    return this._method;
  }
  get productId() {
    return this._productId;
  }
  get status() {
    return this._status;
  }
  get providerTxId() {
    return this._providerTxId;
  }
  get createdAt() {
    return this._createdAt;
  }
  get updatedAt() {
    return this._updatedAt;
  }

  isPending() {
    return this._status === PaymentStatus.PENDING;
  }

  isProcessed() {
    return this._status === PaymentStatus.PROCESSED;
  }

  isFailed() {
    return this._status === PaymentStatus.FAILED;
  }

  isTerminal() {
    return this.isProcessed() || this.isFailed();
  }

  /**
   * @param {string} providerTxId
   * @returns {this}
   */
  attachProviderTransaction(providerTxId) {
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

  /**
   * @param {string} providerTxId
   * @returns {this}
   */
  markAsProcessed(providerTxId) {
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

  /**
   * @returns {this}
   */
  markAsFailed() {
    if (this._status === PaymentStatus.FAILED) {
      return this;
    }
    this._assertCanTransitionTo(PaymentStatus.FAILED);
    this._status = PaymentStatus.FAILED;
    this._touch();
    return this;
  }

  toJSON() {
    return {
      paymentId: this._id,
      status: this._status,
    };
  }

  /** @private */
  _validateRequiredFields({ userId, amount, currency, method, productId }) {
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

  /** @private */
  _validateStatus() {
    if (!Object.values(PaymentStatus).includes(this._status)) {
      throw new Error(`Invalid payment status: ${this._status}`);
    }
  }

  /** @private */
  _assertCanTransitionTo(target) {
    const allowed = ALLOWED_TRANSITIONS[this._status];
    if (!allowed || !allowed.has(target)) {
      throw new InvalidPaymentStateTransitionError(this._status, target, this._id);
    }
  }

  /** @private */
  _touch() {
    this._updatedAt = new Date();
  }
}

module.exports = { Payment, PaymentStatus, PaymentMethod };
