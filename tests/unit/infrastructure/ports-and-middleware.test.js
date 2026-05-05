'use strict';

const { PaymentGateway } = require('../../../src/domain/ports/PaymentGateway');

describe('PaymentGateway', () => {
  it('should throw on createPayment()', async () => {
    const port = new PaymentGateway();
    await expect(port.createPayment({})).rejects.toThrow('not implemented');
  });

  it('should throw on getPaymentStatus()', async () => {
    const port = new PaymentGateway();
    await expect(port.getPaymentStatus('x')).rejects.toThrow('not implemented');
  });
});
