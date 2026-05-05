'use strict';

const { PaymentWebhookController } = require('../../../src/infrastructure/http/controllers/PaymentWebhookController');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('PaymentWebhookController', () => {
  let service;
  let controller;

  beforeEach(() => {
    service = { execute: jest.fn().mockResolvedValue(undefined) };
    controller = new PaymentWebhookController(service);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('delega para o service e retorna 200 com received', async () => {
    const req = {
      body: { event: 'payment.approved', data: { tx_id: 't1' } },
    };
    const res = makeRes();

    await controller.handlePaymentWebhook(req, res);

    expect(service.execute).toHaveBeenCalledWith({ event: 'payment.approved', data: { tx_id: 't1' } });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });

  it('retorna 200 mesmo se o service lançar (ack para o provedor)', async () => {
    service.execute.mockRejectedValue(new Error('boom'));
    const req = { body: { event: 'x', data: { tx_id: 't1' } } };
    const res = makeRes();
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await controller.handlePaymentWebhook(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ received: true });
  });
});
