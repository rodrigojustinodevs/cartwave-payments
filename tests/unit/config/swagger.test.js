'use strict';

describe('OpenAPI spec (swagger-jsdoc)', () => {
  it('gera documento OpenAPI 3 com paths de pagamentos', () => {
    const spec = require('../../../src/config/swagger');

    expect(spec.openapi).toMatch(/^3\.0\./);
    expect(spec.info.title).toBe('Cartwave Payments API');
    expect(spec.paths['/api/v1/auth/login']).toBeDefined();
    expect(spec.paths['/api/v1/users']).toBeDefined();
    expect(spec.paths['/api/v1/payments'].post).toBeDefined();
    expect(spec.paths['/api/v1/payments/{paymentId}'].get).toBeDefined();
    expect(spec.paths['/api/v1/webhooks/payment'].post).toBeDefined();
    expect(spec.components.schemas.PaymentRequest).toBeDefined();
    expect(spec.components.schemas.WebhookEvent).toBeDefined();
    expect(spec.components.schemas.ErrorResponse).toBeDefined();
  });
});
