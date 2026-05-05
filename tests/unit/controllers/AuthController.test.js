'use strict';

const { validationResult } = require('express-validator');
const { AuthController } = require('../../../src/infrastructure/http/controllers/AuthController');

jest.mock('express-validator', () => ({
  ...jest.requireActual('express-validator'),
  validationResult: jest.fn(),
}));

describe('AuthController', () => {
  beforeEach(() => {
    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
  });

  it('should return 200 with token on login', async () => {
    const loginUC = {
      execute: jest.fn().mockResolvedValue({ token: 't', user: { id: '1', email: 'a@b.com' } }),
    };
    const ctrl = new AuthController(loginUC);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await ctrl.login({ body: { email: 'a@b.com', password: 'x' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ token: 't', user: { id: '1', email: 'a@b.com' } });
  });

  it('should return 401 on INVALID_CREDENTIALS', async () => {
    const err = new Error('Invalid credentials');
    err.code = 'INVALID_CREDENTIALS';
    const loginUC = { execute: jest.fn().mockRejectedValue(err) };
    const ctrl = new AuthController(loginUC);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await ctrl.login({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
