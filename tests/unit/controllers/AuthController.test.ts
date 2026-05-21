import { jest } from '@jest/globals';

const validationResultMock = jest.fn();

jest.unstable_mockModule('express-validator', () => ({
  validationResult: validationResultMock,
}));

const { AuthController } = await import('../../../src/infrastructure/http/controllers/AuthController.js');

describe('AuthController', () => {
  beforeEach(() => {
    validationResultMock.mockReturnValue({ isEmpty: () => true, array: () => [] });
  });

  it('should return 200 with token on login', async () => {
    const loginUC = {
      execute: jest.fn().mockResolvedValue({ token: 't', user: { id: '1', email: 'a@b.com' } }),
    };
    const ctrl = new AuthController(loginUC);
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await ctrl.login({ body: { email: 'a@b.com', password: 'x' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Login successful',
      data: { token: 't', user: { id: '1', email: 'a@b.com' } },
    });
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
