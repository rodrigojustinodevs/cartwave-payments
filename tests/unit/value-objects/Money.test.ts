import { Money } from '../../../src/domain/value-objects/Money.js';

describe('Money value object', () => {
  describe('construction', () => {
    it('aceita valor positivo e moeda válida', () => {
      const m = new Money(34.52, 'BRL');
      expect(m.amount).toBe(34.52);
      expect(m.currency).toBe('BRL');
      expect(m.minorUnits).toBe(3452);
    });

    it('normaliza moeda para maiúsculas', () => {
      const m = new Money(10, 'usd');
      expect(m.currency).toBe('USD');
    });

    it('rejeita amount zero, negativo, infinito ou não-número', () => {
      expect(() => new Money(0, 'BRL')).toThrow(/positive finite/);
      expect(() => new Money(-1, 'BRL')).toThrow(/positive finite/);
      expect(() => new Money(Infinity, 'BRL')).toThrow(/positive finite/);
      expect(() => new Money(NaN, 'BRL')).toThrow(/positive finite/);
      expect(() => new Money('10', 'BRL')).toThrow(/positive finite/);
    });

    it('rejeita amount com mais de 2 casas decimais', () => {
      expect(() => new Money(10.123, 'BRL')).toThrow(/at most 2 decimal places/);
    });

    it('rejeita amount acima do limite de 10 dígitos', () => {
      expect(() => new Money(1e10, 'BRL')).toThrow(/exceeds maximum/);
    });

    it('rejeita currency em formato inválido', () => {
      expect(() => new Money(10, 'BR')).toThrow(/3-letter ISO 4217/);
      expect(() => new Money(10, 'BRLX')).toThrow(/3-letter ISO 4217/);
      expect(() => new Money(10, '123')).toThrow(/3-letter ISO 4217/);
      expect(() => new Money(10, undefined)).toThrow(/3-letter ISO 4217/);
    });
  });

  describe('imutabilidade', () => {
    it('é congelado: tentativas de mutar lançam em strict mode', () => {
      const m = new Money(10, 'BRL');
      expect(Object.isFrozen(m)).toBe(true);
      expect(() => {
        m._currency = 'USD';
      }).toThrow(TypeError);
    });
  });

  describe('equals', () => {
    it('compara por valor', () => {
      expect(new Money(10, 'BRL').equals(new Money(10, 'BRL'))).toBe(true);
      expect(new Money(10, 'BRL').equals(new Money(10, 'USD'))).toBe(false);
      expect(new Money(10, 'BRL').equals(new Money(11, 'BRL'))).toBe(false);
      expect(new Money(10, 'BRL').equals(null)).toBe(false);
      expect(new Money(10, 'BRL').equals('10 BRL')).toBe(false);
    });

    it('é insensível a maiúsculas na moeda', () => {
      expect(new Money(10, 'brl').equals(new Money(10, 'BRL'))).toBe(true);
    });
  });

  describe('fromMinorUnits', () => {
    it('constrói a partir de centavos inteiros', () => {
      const m = Money.fromMinorUnits(3452, 'BRL');
      expect(m.amount).toBe(34.52);
      expect(m.minorUnits).toBe(3452);
    });

    it('rejeita não-inteiros ou não-positivos', () => {
      expect(() => Money.fromMinorUnits(10.5, 'BRL')).toThrow(/positive integer/);
      expect(() => Money.fromMinorUnits(0, 'BRL')).toThrow(/positive integer/);
      expect(() => Money.fromMinorUnits(-100, 'BRL')).toThrow(/positive integer/);
    });
  });

  describe('serialização', () => {
    it('toJSON retorna amount e currency', () => {
      expect(new Money(34.52, 'BRL').toJSON()).toEqual({ amount: 34.52, currency: 'BRL' });
    });

    it('toString formata com 2 casas e moeda', () => {
      expect(new Money(34.5, 'BRL').toString()).toBe('34.50 BRL');
    });
  });
});
