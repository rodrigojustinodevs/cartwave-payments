import spec from '../../../src/config/swagger.js';

interface OpenApiSpec {
  openapi: string;
  info: { title: string };
  paths: Record<string, Record<string, unknown>>;
  components: { schemas: Record<string, unknown> };
}

describe('OpenAPI spec (swagger-jsdoc)', () => {
  it('gera documento OpenAPI 3 com paths de pagamentos', () => {
    const doc = spec as OpenApiSpec;
    expect(doc.openapi).toMatch(/^3\.0\./);
    expect(doc.info.title).toBe('Cartwave Payments API');
    expect(doc.paths['/api/v1/auth/login']).toBeDefined();
    expect(doc.paths['/api/v1/users']).toBeDefined();
    expect(doc.paths['/api/v1/payments'].post).toBeDefined();
    expect(doc.paths['/api/v1/payments/{paymentId}'].get).toBeDefined();
    expect(doc.paths['/api/v1/webhooks/payment'].post).toBeDefined();
    expect(doc.components.schemas.PaymentRequest).toBeDefined();
    expect(doc.components.schemas.WebhookEvent).toBeDefined();
    expect(doc.components.schemas.ApiErrorResponse).toBeDefined();
    expect(doc.components.schemas.PaymentSuccessResponse).toBeDefined();
  });
});
