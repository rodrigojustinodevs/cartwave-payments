'use strict';

const request = require('supertest');
const { createApp } = require('../../src/app');

describe('createApp — Swagger UI', () => {
  const mockPrisma = { payment: {}, user: {} };
  const app = createApp(mockPrisma, 'http://external.provider.com');

  it('expõe GET /api-docs (Swagger UI) acessível no navegador', async () => {
    const res = await request(app).get('/api-docs').redirects(2);

    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text.toLowerCase()).toContain('swagger');
  });
});
