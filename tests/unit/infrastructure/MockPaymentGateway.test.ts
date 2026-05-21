import { jest } from '@jest/globals';

describe('MockPaymentGateway', () => {
  const originalUrl = process.env.PAYMENT_PROVIDER_URL;
  const originalBase = process.env.PAYMENT_PROVIDER_BASE_URL;

  afterEach(() => {
    process.env.PAYMENT_PROVIDER_URL = originalUrl;
    process.env.PAYMENT_PROVIDER_BASE_URL = originalBase;
    jest.resetModules();
  });

  async function loadGateway() {
    jest.resetModules();
    const mod = await import(
      `../../../src/infrastructure/providers/MockPaymentGateway.js?cache=${Date.now()}${Math.random()}`
    );
    return mod.MockPaymentGateway;
  }

  it('should use constructor baseURL over env', async () => {
    process.env.PAYMENT_PROVIDER_URL = 'http://ignored';
    const MockPaymentGateway = await loadGateway();
    const g = new MockPaymentGateway('http://explicit');
    expect(g.client.defaults.baseURL).toBe('http://explicit');
  });

  it('should use PAYMENT_PROVIDER_URL when no constructor arg', async () => {
    delete process.env.PAYMENT_PROVIDER_BASE_URL;
    process.env.PAYMENT_PROVIDER_URL = 'http://from-env-url';
    const MockPaymentGateway = await loadGateway();
    const g = new MockPaymentGateway();
    expect(g.client.defaults.baseURL).toBe('http://from-env-url');
  });

  it('should fall back to PAYMENT_PROVIDER_BASE_URL when URL unset', async () => {
    delete process.env.PAYMENT_PROVIDER_URL;
    process.env.PAYMENT_PROVIDER_BASE_URL = 'http://legacy-base';
    const MockPaymentGateway = await loadGateway();
    const g = new MockPaymentGateway();
    expect(g.client.defaults.baseURL).toBe('http://legacy-base');
  });

  it('should default to localhost:3110 when no env nor arg', async () => {
    delete process.env.PAYMENT_PROVIDER_URL;
    delete process.env.PAYMENT_PROVIDER_BASE_URL;
    const MockPaymentGateway = await loadGateway();
    const g = new MockPaymentGateway();
    expect(g.client.defaults.baseURL).toBe('http://localhost:3110');
  });

  it('should map connection refused to GATEWAY_UNAVAILABLE', async () => {
    const { default: axios } = await import('axios');
    const MockPaymentGateway = await loadGateway();
    const g = new MockPaymentGateway('http://localhost:3110');
    const err = new axios.AxiosError('connect ECONNREFUSED');
    err.code = 'ECONNREFUSED';
    jest.spyOn(g.client, 'post').mockRejectedValue(err);

    await expect(
      g.createPayment({
        amount: 100,
        currency: 'BRL',
        paymentMethod: 'pix',
        productId: 'p1',
      })
    ).rejects.toMatchObject({
      code: 'GATEWAY_UNAVAILABLE',
      message: 'Payment provider is unreachable',
    });
  });

  it('should map HTTP error response to GATEWAY_HTTP_ERROR', async () => {
    const { default: axios } = await import('axios');
    const MockPaymentGateway = await loadGateway();
    const g = new MockPaymentGateway('http://localhost:3110');
    const err = new axios.AxiosError('Request failed');
    err.response = { status: 502, data: {} };

    jest.spyOn(g.client, 'post').mockRejectedValue(err);

    await expect(
      g.createPayment({
        amount: 100,
        currency: 'BRL',
        paymentMethod: 'pix',
        productId: 'p1',
      })
    ).rejects.toMatchObject({
      code: 'GATEWAY_HTTP_ERROR',
      status: 502,
    });
  });
});
