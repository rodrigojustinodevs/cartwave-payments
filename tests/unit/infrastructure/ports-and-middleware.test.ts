import { RealPaymentGateway } from '../../../src/infrastructure/providers/RealPaymentGateway.js';

describe('RealPaymentGateway', () => {
  it('should throw on createPayment()', async () => {
    const gateway = new RealPaymentGateway();
    await expect(
      gateway.createPayment({
        amount: 1,
        currency: 'BRL',
        paymentMethod: 'pix',
        productId: 'product-1',
      })
    ).rejects.toThrow('not implemented');
  });

  it('should throw on getPaymentStatus()', async () => {
    const gateway = new RealPaymentGateway();
    await expect(gateway.getPaymentStatus('x')).rejects.toThrow('not implemented');
  });
});
