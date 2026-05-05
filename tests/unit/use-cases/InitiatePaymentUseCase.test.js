'use strict';

const { InitiatePaymentUseCase } = require('../../../src/domain/use-cases/InitiatePaymentUseCase');
const { PaymentStatus } = require('../../../src/domain/entities/Payment');

describe('InitiatePaymentUseCase', () => {
  const input = {
    amount: 3452,
    currency: 'BRL',
    method: 'PAYPAL',
    productId: '87e9646a-8513-465b-b58d-6df44b9e4925',
    userId: '11111111-1111-4111-8111-111111111111',
  };

  let mockRepository;
  let mockUserRepository;
  let mockGateway;
  let useCase;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn().mockImplementation(async (p) => p),
      update: jest.fn().mockImplementation(async (p) => p),
      findById: jest.fn(),
    };
    mockUserRepository = {
      findById: jest.fn().mockResolvedValue({ id: input.userId }),
    };
    mockGateway = {
      createPayment: jest.fn().mockResolvedValue({
        txId: 'b018b23b-9931-4438-b55f-782edb05b4c2',
        status: 'processed',
      }),
    };
    useCase = new InitiatePaymentUseCase(mockRepository, mockUserRepository, mockGateway);
  });

  it('should reject when user does not exist', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute(input)).rejects.toMatchObject({
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    });

    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should save the payment, call gateway, and return paymentId with status', async () => {
    const result = await useCase.execute(input);

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
    expect(mockGateway.createPayment).toHaveBeenCalledWith({
      amount: 3452,
      currency: 'BRL',
      paymentMethod: 'pay-pal',
      productId: '87e9646a-8513-465b-b58d-6df44b9e4925',
    });
    expect(mockRepository.update).toHaveBeenCalledTimes(1);

    expect(result).toHaveProperty('paymentId');
    expect(result.status).toBe(PaymentStatus.PENDING);
    const updated = mockRepository.update.mock.calls[0][0];
    expect(updated.providerTxId).toBe('b018b23b-9931-4438-b55f-782edb05b4c2');
  });

  it('should log structured pending-await-webhook info when txId is returned', async () => {
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    try {
      const result = await useCase.execute(input);

      expect(result.status).toBe(PaymentStatus.PENDING);
      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledWith(
        '[InitiatePayment] pending awaiting webhook',
        expect.objectContaining({
          paymentId: result.paymentId,
          providerTxId: 'b018b23b-9931-4438-b55f-782edb05b4c2',
          method: 'PAYPAL',
          userId: input.userId,
        })
      );
    } finally {
      infoSpy.mockRestore();
    }
  });

  it('should mark payment as failed if gateway throws', async () => {
    mockGateway.createPayment.mockRejectedValue(new Error('Gateway down'));

    const result = await useCase.execute(input);

    expect(result.status).toBe(PaymentStatus.FAILED);
    expect(mockRepository.update).toHaveBeenCalledTimes(1);
  });

  it('should keep pending and set providerTxId when gateway returns pending', async () => {
    mockGateway.createPayment.mockResolvedValue({
      txId: 'pending-tx-1',
      status: 'pending',
    });

    const result = await useCase.execute(input);

    expect(result.status).toBe(PaymentStatus.PENDING);
    expect(mockRepository.update).toHaveBeenCalledTimes(1);
    const updated = mockRepository.update.mock.calls[0][0];
    expect(updated.providerTxId).toBe('pending-tx-1');
  });

  it('should keep pending when gateway returns refused with txId', async () => {
    mockGateway.createPayment.mockResolvedValue({
      txId: 'refused-tx',
      status: 'refused',
    });

    const result = await useCase.execute(input);

    expect(result.status).toBe(PaymentStatus.PENDING);
    const updated = mockRepository.update.mock.calls[0][0];
    expect(updated.providerTxId).toBe('refused-tx');
  });

  it('should keep pending when gateway returns unknown status with txId', async () => {
    mockGateway.createPayment.mockResolvedValue({
      txId: 'weird-tx',
      status: 'unknown_state',
    });

    const result = await useCase.execute(input);

    expect(result.status).toBe(PaymentStatus.PENDING);
  });

  it('should mark failed when processed but missing txId', async () => {
    mockGateway.createPayment.mockResolvedValue({
      txId: null,
      status: 'processed',
    });

    const result = await useCase.execute(input);

    expect(result.status).toBe(PaymentStatus.FAILED);
  });

  it('should map PAYPAL method to pay-pal for gateway', async () => {
    await useCase.execute(input);

    expect(mockGateway.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: 'pay-pal' })
    );
  });

  it('should map CREDIT_CARD method to credit-card for gateway', async () => {
    await useCase.execute({ ...input, method: 'CREDIT_CARD' });

    expect(mockGateway.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: 'credit-card' })
    );
  });

  it('should save payment in pending status before calling gateway', async () => {
    let statusAtSaveTime;
    mockRepository.save.mockImplementation(async (p) => {
      statusAtSaveTime = p.status;
      return p;
    });

    await useCase.execute(input);

    expect(statusAtSaveTime).toBe(PaymentStatus.PENDING);
  });
});
