import request from 'supertest';
import type { PrismaClient } from '@prisma/client';
import { createApp } from '../../src/app.js';

describe('createApp — Swagger UI', () => {
  const mockPrisma = { payment: {}, user: {} } as unknown as PrismaClient;
  const app = createApp(mockPrisma, 'http://external.provider.com');

  it('expõe GET /api-docs (Swagger UI) acessível no navegador', async () => {
    const res = await request(app).get('/api-docs').redirects(2);

    expect(res.status).toBe(200);
    expect(res.type).toMatch(/html/);
    expect(res.text.toLowerCase()).toContain('swagger');
  });
});
