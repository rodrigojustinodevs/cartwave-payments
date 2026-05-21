import { jest } from '@jest/globals';
import { GetPaymentStatusUseCase } from '../../../src/domain/use-cases/GetPaymentStatusUseCase.js';
import { Payment, PaymentStatus } from '../../../src/domain/entities/Payment.js';
import { UserRole } from '../../../src/domain/entities/User.js';

const OWNER_ID = '11111111-1111-4111-8111-111111111111';

const authUser = { actorUserId: OWNER_ID, actorRole: UserRole.USER };
const authAdmin = { actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', actorRole: UserRole.ADMIN };

const makePayment = (overrides = {}) =>
  new Payment({
    id: 'pay-123',
    userId: OWNER_ID,
    amount: 3452,
    currency: 'BRL',
    method: 'PAYPAL',
    productId: 'prod-456',
    status: PaymentStatus.PENDING,
    ...overrides,
  });

describe('GetPaymentStatusUseCase', () => {
  let mockRepository;
  let useCase;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      update: jest.fn().mockImplementation(async (p) => p),
    };
    useCase = new GetPaymentStatusUseCase(mockRepository);
  });

  it('should return paymentId and status for an existing payment', async () => {
    const payment = makePayment({ status: PaymentStatus.PENDING });
    mockRepository.findById.mockResolvedValue(payment);

    const result = await useCase.execute('pay-123', authUser);

    expect(result).toEqual({ paymentId: 'pay-123', status: PaymentStatus.PENDING });
  });

  it('should throw PAYMENT_NOT_FOUND error when payment does not exist', async () => {
    mockRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent', authUser)).rejects.toMatchObject({
      code: 'PAYMENT_NOT_FOUND',
    });
  });

  it('should throw FORBIDDEN when user is not owner or admin', async () => {
    const payment = makePayment();
    mockRepository.findById.mockResolvedValue(payment);

    await expect(
      useCase.execute('pay-123', { actorUserId: '99999999-9999-4999-8999-999999999999', actorRole: UserRole.USER })
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('should allow admin to read any payment', async () => {
    const payment = makePayment();
    mockRepository.findById.mockResolvedValue(payment);

    const result = await useCase.execute('pay-123', authAdmin);

    expect(result.paymentId).toBe('pay-123');
  });

  it('should never mutate state on GET (no repository.update calls)', async () => {
    const payment = makePayment({ providerTxId: 'tx-abc', status: PaymentStatus.PENDING });
    mockRepository.findById.mockResolvedValue(payment);

    const result = await useCase.execute('pay-123', authUser);

    expect(mockRepository.update).not.toHaveBeenCalled();
    expect(result.status).toBe(PaymentStatus.PENDING);
  });

  it('should return processed when payment was already processed via webhook', async () => {
    const payment = makePayment({
      providerTxId: 'tx-abc',
      status: PaymentStatus.PROCESSED,
    });
    mockRepository.findById.mockResolvedValue(payment);

    const result = await useCase.execute('pay-123', authUser);

    expect(result.status).toBe(PaymentStatus.PROCESSED);
    expect(mockRepository.update).not.toHaveBeenCalled();
  });
});
