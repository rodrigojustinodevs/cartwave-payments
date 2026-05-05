'use strict';

const request = require('supertest');
const nock = require('nock');
const { InitiatePaymentUseCase } = require('../../src/domain/use-cases/InitiatePaymentUseCase');
const { GetPaymentStatusUseCase } = require('../../src/domain/use-cases/GetPaymentStatusUseCase');
const { MockPaymentGateway } = require('../../src/infrastructure/providers/MockPaymentGateway');
const { PaymentController } = require('../../src/infrastructure/http/controllers/PaymentController');
const { createPaymentRouter } = require('../../src/infrastructure/http/routes/paymentRoutes');
const { errorHandler, notFoundHandler } = require('../../src/infrastructure/http/middlewares/errorHandler');
const { JwtTokenService } = require('../../src/infrastructure/security/JwtTokenService');
const { createAuthMiddleware } = require('../../src/infrastructure/http/middlewares/authMiddleware');
const { Payment, PaymentStatus } = require('../../src/domain/entities/Payment');
const { UserRole } = require('../../src/domain/entities/User');

const PROVIDER_BASE_URL = 'http://external.provider.com';
const JWT_SECRET = 'integration-test-jwt-secret';

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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
  const validIds = new Set([USER_ID, OTHER_USER_ID]);
  return {
    findById: jest.fn(async (id) => (validIds.has(id) ? { id } : null)),
  };
}

function buildApp(repository, userRepository = createUserRepository()) {
  const express = require('express');
  const tokenService = new JwtTokenService(JWT_SECRET);
  const authMiddleware = createAuthMiddleware(tokenService);
  const gateway = new MockPaymentGateway(PROVIDER_BASE_URL);
  const initiateUC = new InitiatePaymentUseCase(repository, userRepository, gateway);
  const getStatusUC = new GetPaymentStatusUseCase(repository, gateway);
  const controller = new PaymentController(initiateUC, getStatusUC);

  const app = express();
  app.use(express.json());
  app.use('/api/v1', createPaymentRouter(controller, authMiddleware));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, tokenService };
}

describe('Payment API Integration Tests', () => {
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

  describe('POST /api/v1/payments', () => {
    it('should initiate a payment successfully and return 201', async () => {
      nock(PROVIDER_BASE_URL).post('/payments').reply(201, {
        tx_id: 'b018b23b-9931-4438-b55f-782edb05b4c2',
        status: 'processed',
      });

      const res = await request(app)
        .post('/api/v1/payments')
        .set(bearer(USER_ID))
        .send({
          amount: 3452,
          currency: 'BRL',
          method: 'PAYPAL',
          product_id: '87e9646a-8513-465b-b58d-6df44b9e4925',
          user_id: USER_ID,
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('paymentId');
      expect(res.body.status).toBe(PaymentStatus.PENDING);
    });

    it('should return 401 without Authorization header', async () => {
      const res = await request(app).post('/api/v1/payments').send({
        amount: 1000,
        currency: 'BRL',
        method: 'PAYPAL',
        product_id: 'prod-001',
        user_id: USER_ID,
      });
      expect(res.status).toBe(401);
    });

    it('should return 201 with failed status when provider is unavailable', async () => {
      nock(PROVIDER_BASE_URL).post('/payments').replyWithError('Connection refused');

      const res = await request(app)
        .post('/api/v1/payments')
        .set(bearer(USER_ID))
        .send({
          amount: 1000,
          currency: 'BRL',
          method: 'PAYPAL',
          product_id: 'prod-001',
          user_id: USER_ID,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe(PaymentStatus.FAILED);
    });

    it('should return 403 when user_id does not match token subject', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set(bearer(USER_ID))
        .send({
          amount: 1000,
          currency: 'BRL',
          method: 'PAYPAL',
          product_id: 'prod-001',
          user_id: OTHER_USER_ID,
        });

      expect(res.status).toBe(403);
    });

    it('should return 404 when user_id does not exist (admin)', async () => {
      const unknownUserId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
      const res = await request(app)
        .post('/api/v1/payments')
        .set(bearer('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', UserRole.ADMIN))
        .send({
          amount: 1000,
          currency: 'BRL',
          method: 'PAYPAL',
          product_id: 'prod-001',
          user_id: unknownUserId,
        });

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'User not found' });
    });

    it('should return 400 if amount is missing', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set(bearer(USER_ID))
        .send({ currency: 'BRL', method: 'PAYPAL', product_id: 'prod-001', user_id: USER_ID });

      expect(res.status).toBe(400);
    });

    it('should return 400 if amount is negative', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set(bearer(USER_ID))
        .send({
          amount: -10,
          currency: 'BRL',
          method: 'PAYPAL',
          product_id: 'prod-001',
          user_id: USER_ID,
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 if currency is missing', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set(bearer(USER_ID))
        .send({ amount: 100, method: 'PAYPAL', product_id: 'prod-001', user_id: USER_ID });

      expect(res.status).toBe(400);
    });

    it('should return 400 if product_id is missing', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set(bearer(USER_ID))
        .send({ amount: 100, currency: 'BRL', method: 'PAYPAL', user_id: USER_ID });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/payments/:paymentId', () => {
    it('should return payment status for an existing payment', async () => {
      const payment = new Payment({
        id: 'existing-pay-id',
        userId: USER_ID,
        amount: 500,
        currency: 'BRL',
        method: 'PAYPAL',
        productId: 'prod-123',
        status: PaymentStatus.PENDING,
        providerTxId: null,
      });
      repository._store.set(payment.id, payment);

      const res = await request(app).get('/api/v1/payments/existing-pay-id').set(bearer(USER_ID));

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        paymentId: 'existing-pay-id',
        status: PaymentStatus.PENDING,
      });
    });

    it('should return 403 when reading another users payment', async () => {
      const payment = new Payment({
        id: 'secret-pay',
        userId: OTHER_USER_ID,
        amount: 500,
        currency: 'BRL',
        method: 'PAYPAL',
        productId: 'prod-123',
        status: PaymentStatus.PENDING,
        providerTxId: null,
      });
      repository._store.set(payment.id, payment);

      const res = await request(app).get('/api/v1/payments/secret-pay').set(bearer(USER_ID));

      expect(res.status).toBe(403);
    });

    it('should sync with provider and return updated status', async () => {
      const payment = new Payment({
        id: 'pay-with-tx',
        userId: USER_ID,
        amount: 500,
        currency: 'BRL',
        method: 'PAYPAL',
        productId: 'prod-123',
        status: PaymentStatus.PENDING,
        providerTxId: 'tx-provider-001',
      });
      repository._store.set(payment.id, payment);

      nock(PROVIDER_BASE_URL)
        .get('/payments/tx-provider-001')
        .reply(200, { tx_id: 'tx-provider-001', status: 'processed' });

      const res = await request(app).get('/api/v1/payments/pay-with-tx').set(bearer(USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(PaymentStatus.PROCESSED);
    });

    it('should return 404 for a non-existent payment', async () => {
      const res = await request(app).get('/api/v1/payments/does-not-exist').set(bearer(USER_ID));

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error');
    });

    it('should return last known status if provider sync fails', async () => {
      const payment = new Payment({
        id: 'pay-provider-down',
        userId: USER_ID,
        amount: 500,
        currency: 'BRL',
        method: 'PAYPAL',
        productId: 'prod-123',
        status: PaymentStatus.PENDING,
        providerTxId: 'tx-broken',
      });
      repository._store.set(payment.id, payment);

      nock(PROVIDER_BASE_URL).get('/payments/tx-broken').replyWithError('timeout');

      const res = await request(app).get('/api/v1/payments/pay-provider-down').set(bearer(USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(PaymentStatus.PENDING);
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for undefined routes', async () => {
      const res = await request(app).get('/api/v1/unknown').set(bearer(USER_ID));
      expect(res.status).toBe(404);
    });
  });
});
