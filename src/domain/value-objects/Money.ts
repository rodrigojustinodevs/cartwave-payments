export class Money {
  private readonly _minorUnits: number;
  private readonly _currency: string;

  constructor(amount: number, currency: string) {
    Money._assertValidAmount(amount);
    Money._assertValidCurrency(currency);

    this._minorUnits = Math.round(amount * 100);
    this._currency = currency.toUpperCase();

    Object.freeze(this);
  }

  static fromMinorUnits(minorUnits: number, currency: string): Money {
    if (!Number.isInteger(minorUnits) || minorUnits <= 0) {
      throw new Error('Money minor units must be a positive integer');
    }
    return new Money(minorUnits / 100, currency);
  }

  get amount(): number {
    return this._minorUnits / 100;
  }

  get minorUnits(): number {
    return this._minorUnits;
  }

  get currency(): string {
    return this._currency;
  }

  equals(other: Money): boolean {
    if (!(other instanceof Money)) {
      return false;
    }
    return this._minorUnits === other._minorUnits && this._currency === other._currency;
  }

  toJSON(): { amount: number; currency: string } {
    return { amount: this.amount, currency: this._currency };
  }

  toString(): string {
    return `${this.amount.toFixed(2)} ${this._currency}`;
  }

  private static _assertValidAmount(amount: number): void {
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      throw new Error('Money amount must be a positive finite number');
    }

    const scaled = amount * 100;
    if (Math.abs(scaled - Math.round(scaled)) > 1e-9) {
      throw new Error('Money amount must have at most 2 decimal places');
    }

    if (amount >= 1e10) {
      throw new Error('Money amount exceeds maximum allowed (10 digits)');
    }
  }

  private static _assertValidCurrency(currency: string): void {
    if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency.toUpperCase())) {
      throw new Error('Money currency must be a 3-letter ISO 4217 code');
    }
  }
}
