import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaPaymentRepository } from '../../src/infrastructure/database/repositories/PrismaPaymentRepository.js';
import { Payment, PaymentStatus } from '../../src/domain/entities/Payment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

describe('PrismaPaymentRepository Integration Tests', () => {
  let container;
  let prisma;
  let repository;
  let testUserId;
  let databaseUrl;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_pass')
      .start();

    databaseUrl = `${container.getConnectionUri()}?schema=public`;
    process.env.DATABASE_URL = databaseUrl;

    execSync('npx prisma migrate deploy', {
      cwd: projectRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
    });

    const adapter = new PrismaPg({ connectionString: databaseUrl });
    prisma = new PrismaClient({ adapter });
    repository = new PrismaPaymentRepository(prisma);
  }, 120000);

  afterAll(async () => {
    if (prisma) await prisma.$disconnect();
    if (container) await container.stop();
  });

  beforeEach(async () => {
    await prisma.payment.deleteMany();
    await prisma.user.deleteMany();

    testUserId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const hash = await bcrypt.hash('test-password-ok', 4);
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `user-${testUserId}@test.local`,
        name: 'Integration User',
        passwordHash: hash,
        role: 'user',
      },
    });
  });

  const makePayment = (overrides = {}) =>
    new Payment({
      userId: testUserId,
      amount: 3452,
      currency: 'BRL',
      method: 'PAYPAL',
      productId: '87e9646a-8513-465b-b58d-6df44b9e4925',
      ...overrides,
    });

  describe('save()', () => {
    it('should persist a payment to the database', async () => {
      const payment = makePayment();
      await repository.save(payment);

      const row = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(row).not.toBeNull();
      expect(row.id).toBe(payment.id);
      expect(row.userId).toBe(testUserId);
      expect(row.status).toBe(PaymentStatus.PENDING);
    });

    it('should return the saved payment as a Payment entity', async () => {
      const payment = makePayment();
      const saved = await repository.save(payment);

      expect(saved).toBeInstanceOf(Payment);
      expect(saved.id).toBe(payment.id);
      expect(saved.userId).toBe(testUserId);
    });
  });

  describe('findById()', () => {
    it('should retrieve an existing payment', async () => {
      const payment = makePayment();
      await repository.save(payment);

      const found = await repository.findById(payment.id);

      expect(found).toBeInstanceOf(Payment);
      expect(found.id).toBe(payment.id);
      expect(found.amount).toBe(3452);
      expect(found.currency).toBe('BRL');
      expect(found.userId).toBe(testUserId);
    });

    it('should return null for a non-existent id', async () => {
      const found = await repository.findById('00000000-0000-4000-8000-000000000099');
      expect(found).toBeNull();
    });
  });

  describe('update()', () => {
    it('should update status and providerTxId', async () => {
      const payment = makePayment();
      await repository.save(payment);

      payment.markAsProcessed('tx-from-provider-123');
      await repository.update(payment);

      const found = await repository.findById(payment.id);
      expect(found.status).toBe(PaymentStatus.PROCESSED);
      expect(found.providerTxId).toBe('tx-from-provider-123');
    });

    it('should update status to failed', async () => {
      const payment = makePayment();
      await repository.save(payment);

      payment.markAsFailed();
      await repository.update(payment);

      const found = await repository.findById(payment.id);
      expect(found.status).toBe(PaymentStatus.FAILED);
    });
  });

  describe('findByProviderTxId()', () => {
    it('should return payment when provider_tx_id matches', async () => {
      const payment = makePayment();
      await repository.save(payment);
      payment.attachProviderTransaction('ext-provider-tx-42');
      await repository.update(payment);

      const found = await repository.findByProviderTxId('ext-provider-tx-42');

      expect(found).not.toBeNull();
      expect(found.id).toBe(payment.id);
      expect(found.providerTxId).toBe('ext-provider-tx-42');
    });

    it('should return null when no payment has that provider id', async () => {
      const found = await repository.findByProviderTxId('non-existent-tx');
      expect(found).toBeNull();
    });
  });
});
