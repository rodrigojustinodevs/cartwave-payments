'use strict';

const { createAuthMiddleware, requireRole } = require('../../../../src/infrastructure/http/middlewares/authMiddleware');
const { UserRole } = require('../../../../src/domain/entities/User');

describe('authMiddleware', () => {
  it('should return 401 when Authorization missing', () => {
    const tokenService = { verify: jest.fn() };
    const mw = createAuthMiddleware(tokenService);
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    mw(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should set req.user when token valid', () => {
    const tokenService = {
      verify: jest.fn().mockReturnValue({ sub: 'uid', role: 'admin' }),
    };
    const mw = createAuthMiddleware(tokenService);
    const req = { headers: { authorization: 'Bearer good.token' } };
    const res = { status: jest.fn(), json: jest.fn() };
    const next = jest.fn();

    mw(req, res, next);

    expect(req.user).toEqual({ id: 'uid', role: 'admin' });
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 when verify throws', () => {
    const tokenService = {
      verify: jest.fn().mockImplementation(() => {
        throw new Error('invalid');
      }),
    };
    const mw = createAuthMiddleware(tokenService);
    const req = { headers: { authorization: 'Bearer x.y.z' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    mw(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireRole', () => {
  it('should return 403 when role mismatch', () => {
    const mw = requireRole(UserRole.ADMIN);
    const req = { user: { role: UserRole.USER } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    mw(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next when role matches', () => {
    const mw = requireRole(UserRole.ADMIN);
    const req = { user: { role: UserRole.ADMIN } };
    const res = { status: jest.fn(), json: jest.fn() };
    const next = jest.fn();

    mw(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
