'use strict';

const request = require('supertest');
const nock = require('nock');
const express = require('express');
const { InitiatePaymentUseCase } = require('../../src/domain/use-cases/InitiatePaymentUseCase');
const { GetPaymentStatusUseCase } = require('../../src/domain/use-cases/GetPaymentStatusUseCase');
const { PaymentWebhookService } = require('../../src/domain/use-cases/PaymentWebhookService');
const { MockPaymentGateway } = require('../../src/infrastructure/providers/MockPaymentGateway');
const { PaymentController } = require('../../src/infrastructure/http/controllers/PaymentController');
const { PaymentWebhookController } = require('../../src/infrastructure/http/controllers/PaymentWebhookController');
const { createPaymentRouter } = require('../../src/infrastructure/http/routes/paymentRoutes');
const { createWebhookRouter } = require('../../src/infrastructure/http/routes/webhookRoutes');
const { createWebhookAuthMiddleware } = require('../../src/infrastructure/http/middlewares/webhookAuthMiddleware');
const { errorHandler, notFoundHandler } = require('../../src/infrastructure/http/middlewares/errorHandler');
const { JwtTokenService } = require('../../src/infrastructure/security/JwtTokenService');
const { createAuthMiddleware } = require('../../src/infrastructure/http/middlewares/authMiddleware');
const { PaymentStatus } = require('../../src/domain/entities/Payment');
const { UserRole } = require('../../src/domain/entities/User');

const PROVIDER_BASE_URL = 'http://external.provider.com';
const JWT_SECRET = 'integration-test-jwt-secret';
const WEBHOOK_SECRET = 'test-webhook-secret';
const TX_ID = 'b018b23b-9931-4438-b55f-782edb05b4c2';
const REFUSED_TX = 'c222c22c-2222-4222-8222-c222c22c2222';
const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function createInMemoryRepository() {
  const store = new Map();
  return {
    save: jest.fn(async (payment) => {
      store.set(payment.id, payment);
      return payment;
    }),
    findById: jest.fn(async (id) => store.get(id) || null),
    findByProviderTxId: jest.fn(async (txId) => {
      for (const p of store.values()) {
        if (p.providerTxId === txId) {
          return p;
        }
      }
      return null;
    }),
    update: jest.fn(async (payment) => {
      store.set(payment.id, payment);
      return payment;
    }),
    _store: store,
  };
}

function createUserRepository() {
  return {
    findById: jest.fn(async (id) => (id === USER_ID ? { id } : null)),
  };
}

function buildApp(repository, userRepository = createUserRepository()) {
  const tokenService = new JwtTokenService(JWT_SECRET);
  const authMiddleware = createAuthMiddleware(tokenService);
  const gateway = new MockPaymentGateway(PROVIDER_BASE_URL);
  const initiateUC = new InitiatePaymentUseCase(repository, userRepository, gateway);
  const getStatusUC = new GetPaymentStatusUseCase(repository, gateway);
  const paymentController = new PaymentController(initiateUC, getStatusUC);
  const paymentWebhookService = new PaymentWebhookService(repository);
  const paymentWebhookController = new PaymentWebhookController(paymentWebhookService);
  const webhookAuth = createWebhookAuthMiddleware(WEBHOOK_SECRET);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createPaymentRouter(paymentController, authMiddleware));
  app.use('/api/v1', createWebhookRouter(paymentWebhookController, webhookAuth));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return { app, tokenService };
}

describe('Payment webhook integration', () => {
  let app;
  let repository;
  let tokenService;

  beforeEach(() => {
    nock.cleanAll();
    repository = createInMemoryRepository();
    const built = buildApp(repository);
    app = built.app;
    tokenService = built.tokenService;
  });

  afterEach(() => {
    nock.cleanAll();
  });

  function bearer(userId, role = UserRole.USER) {
    const token = tokenService.sign({ sub: userId, role });
    return { Authorization: `Bearer ${token}` };
  }

  it('cria pagamento e aprova via webhook (status processed)', async () => {
    nock(PROVIDER_BASE_URL).post('/payments').reply(201, { tx_id: TX_ID, status: 'processed' });

    const createRes = await request(app)
      .post('/api/v1/payments')
      .set(bearer(USER_ID))
      .send({
        amount: 3452,
        currency: 'BRL',
        method: 'PAYPAL',
        product_id: '87e9646a-8513-465b-b58d-6df44b9e4925',
        user_id: USER_ID,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.status).toBe(PaymentStatus.PENDING);
    const paymentId = createRes.body.paymentId;

    const hookRes = await request(app)
      .post('/api/v1/webhooks/payment')
      .set('X-Webhook-Token', WEBHOOK_SECRET)
      .send({
        event: 'payment.approved',
        data: { tx_id: TX_ID, status: 'processed' },
      });

    expect(hookRes.status).toBe(200);

    const statusRes = await request(app).get(`/api/v1/payments/${paymentId}`).set(bearer(USER_ID));

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.status).toBe(PaymentStatus.PROCESSED);
  });

  it('webhook duplicado não altera estado após terminal', async () => {
    nock(PROVIDER_BASE_URL).post('/payments').reply(201, { tx_id: TX_ID, status: 'processed' });

    const createRes = await request(app)
      .post('/api/v1/payments')
      .set(bearer(USER_ID))
      .send({
        amount: 100,
        currency: 'BRL',
        method: 'PAYPAL',
        product_id: 'prod-x',
        user_id: USER_ID,
      });

    const paymentId = createRes.body.paymentId;

    await request(app)
      .post('/api/v1/webhooks/payment')
      .set('X-Webhook-Token', WEBHOOK_SECRET)
      .send({ event: 'payment.approved', data: { tx_id: TX_ID } });

    const updatesAfterFirstWebhook = repository.update.mock.calls.length;

    await request(app)
      .post('/api/v1/webhooks/payment')
      .set('X-Webhook-Token', WEBHOOK_SECRET)
      .send({ event: 'payment.approved', data: { tx_id: TX_ID } });

    expect(repository.update.mock.calls.length).toBe(updatesAfterFirstWebhook);

    const statusRes = await request(app).get(`/api/v1/payments/${paymentId}`).set(bearer(USER_ID));
    expect(statusRes.body.status).toBe(PaymentStatus.PROCESSED);
  });

  it('webhook refused marca pagamento como failed', async () => {
    nock(PROVIDER_BASE_URL).post('/payments').reply(200, { tx_id: REFUSED_TX, status: 'refused' });

    const createRes = await request(app)
      .post('/api/v1/payments')
      .set(bearer(USER_ID))
      .send({
        amount: 500,
        currency: 'BRL',
        method: 'PAYPAL',
        product_id: 'prod-y',
        user_id: USER_ID,
      });

    expect(createRes.body.status).toBe(PaymentStatus.PENDING);

    await request(app)
      .post('/api/v1/webhooks/payment')
      .set('X-Webhook-Token', WEBHOOK_SECRET)
      .send({ event: 'payment.refused', data: { tx_id: REFUSED_TX, status: 'refused' } });

    const paymentId = createRes.body.paymentId;
    const statusRes = await request(app).get(`/api/v1/payments/${paymentId}`).set(bearer(USER_ID));

    expect(statusRes.body.status).toBe(PaymentStatus.FAILED);
  });

  it('retorna 401 sem X-Webhook-Token válido', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/payment')
      .send({ event: 'payment.approved', data: { tx_id: TX_ID } });

    expect(res.status).toBe(401);
  });

  it('retorna 400 quando data não contém tx_id nem id', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/payment')
      .set('X-Webhook-Token', WEBHOOK_SECRET)
      .send({ event: 'payment.approved', data: {} });

    expect(res.status).toBe(400);
  });
});
