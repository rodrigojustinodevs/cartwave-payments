import { jest } from '@jest/globals';
import { PaymentWebhookService } from '../../../src/domain/use-cases/PaymentWebhookService.js';
import { Payment, PaymentStatus } from '../../../src/domain/entities/Payment.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';

function makePayment(overrides = {}) {
  return new Payment({
    id: 'pay-001',
    userId: USER_ID,
    amount: 100,
    currency: 'BRL',
    method: 'PAYPAL',
    productId: 'prod-1',
    status: PaymentStatus.PENDING,
    providerTxId: 'tx-provider-1',
    ...overrides,
  });
}

describe('PaymentWebhookService', () => {
  let repository;
  let service;

  beforeEach(() => {
    repository = {
      findByProviderTxId: jest.fn(),
      update: jest.fn().mockImplementation(async (p) => p),
    };
    service = new PaymentWebhookService(repository);
  });

  it('mapeia payment.approved para processed e atualiza', async () => {
    const payment = makePayment();
    repository.findByProviderTxId.mockResolvedValue(payment);

    await service.execute({
      event: 'payment.approved',
      data: { tx_id: 'tx-provider-1', status: 'processed' },
    });

    expect(repository.update).toHaveBeenCalledTimes(1);
    const updated = repository.update.mock.calls[0][0];
    expect(updated.status).toBe(PaymentStatus.PROCESSED);
  });

  it('mapeia payment.refused para failed', async () => {
    const payment = makePayment();
    repository.findByProviderTxId.mockResolvedValue(payment);

    await service.execute({ event: 'payment.refused', data: { tx_id: 'tx-provider-1' } });

    expect(repository.update).toHaveBeenCalledTimes(1);
    expect(repository.update.mock.calls[0][0].status).toBe(PaymentStatus.FAILED);
  });

  it('mapeia payment.pending para pending (sem update se já pending)', async () => {
    const payment = makePayment();
    repository.findByProviderTxId.mockResolvedValue(payment);

    await service.execute({ event: 'payment.pending', data: { id: 'tx-provider-1' } });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('não atualiza se pagamento não existe', async () => {
    repository.findByProviderTxId.mockResolvedValue(null);

    await service.execute({ event: 'payment.approved', data: { tx_id: 'missing' } });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('idempotente: ignora se status já é terminal (processed)', async () => {
    const payment = makePayment({ status: PaymentStatus.PROCESSED });
    repository.findByProviderTxId.mockResolvedValue(payment);

    await service.execute({ event: 'payment.approved', data: { tx_id: 'tx-provider-1' } });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('idempotente: ignora se status já é failed', async () => {
    const payment = makePayment({ status: PaymentStatus.FAILED });
    repository.findByProviderTxId.mockResolvedValue(payment);

    await service.execute({ event: 'payment.approved', data: { tx_id: 'tx-provider-1' } });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('evento desconhecido não chama update', async () => {
    const payment = makePayment();
    repository.findByProviderTxId.mockResolvedValue(payment);

    await service.execute({ event: 'payment.unknown', data: { tx_id: 'tx-provider-1' } });

    expect(repository.update).not.toHaveBeenCalled();
  });

  it('data sem tx_id nem id não chama repositório', async () => {
    await service.execute({ event: 'payment.approved', data: {} });

    expect(repository.findByProviderTxId).not.toHaveBeenCalled();
  });
});
