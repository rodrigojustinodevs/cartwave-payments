'use strict';

const { createWebhookAuthMiddleware } = require('../../../../src/infrastructure/http/middlewares/webhookAuthMiddleware');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('createWebhookAuthMiddleware', () => {
  it('chama next quando o token X-Webhook-Token corresponde ao segredo', () => {
    const middleware = createWebhookAuthMiddleware('secret-123');
    const next = jest.fn();
    const req = { headers: { 'x-webhook-token': 'secret-123' } };
    const res = makeRes();

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('retorna 401 quando o token não corresponde', () => {
    const middleware = createWebhookAuthMiddleware('secret-123');
    const next = jest.fn();
    const req = { headers: { 'x-webhook-token': 'wrong' } };
    const res = makeRes();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('retorna 401 quando o header está ausente', () => {
    const middleware = createWebhookAuthMiddleware('secret-123');
    const next = jest.fn();
    const req = { headers: {} };
    const res = makeRes();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('retorna 401 quando o segredo não está configurado', () => {
    const middleware = createWebhookAuthMiddleware(undefined);
    const next = jest.fn();
    const req = { headers: { 'x-webhook-token': 'any' } };
    const res = makeRes();

    middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
