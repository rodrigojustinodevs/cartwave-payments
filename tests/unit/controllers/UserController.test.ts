import { jest } from '@jest/globals';

const validationResult = jest.fn();

jest.unstable_mockModule('express-validator', () => ({
  validationResult,
}));

const { UserController } = await import('../../../src/infrastructure/http/controllers/UserController.js');
const { UserRole } = await import('../../../src/domain/entities/User.js');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

function makeController(overrides = {}) {
  return new UserController({
    createUserUseCase: { execute: jest.fn() },
    getUserUseCase: { execute: jest.fn() },
    updateUserUseCase: { execute: jest.fn() },
    deleteUserUseCase: { execute: jest.fn() },
    listUsersUseCase: { execute: jest.fn() },
    ...overrides,
  });
}

describe('UserController', () => {
  beforeEach(() => {
    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
  });

  it('create should return 201', async () => {
    const ctrl = makeController({
      createUserUseCase: { execute: jest.fn().mockResolvedValue({ id: '1', email: 'a@b.com' }) },
    });
    const res = mockRes();

    await ctrl.create({ body: { email: 'a@b.com', name: 'Aa', password: 'secret123' } }, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('create should return 409 on duplicate email', async () => {
    const err = new Error('dup');
    err.code = 'EMAIL_ALREADY_REGISTERED';
    const ctrl = makeController({
      createUserUseCase: { execute: jest.fn().mockRejectedValue(err) },
    });
    const res = mockRes();

    await ctrl.create({ body: { email: 'a@b.com', name: 'Aa', password: 'secret123' } }, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('getMe should return 200', async () => {
    const ctrl = makeController({
      getUserUseCase: { execute: jest.fn().mockResolvedValue({ id: '1', email: 'a@b.com' }) },
    });
    const res = mockRes();

    await ctrl.getMe({ user: { id: '1' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('getById should return 403 for non-owner non-admin', async () => {
    const ctrl = makeController({
      getUserUseCase: { execute: jest.fn().mockResolvedValue({ id: 'other', email: 'x@y.com' }) },
    });
    const res = mockRes();

    await ctrl.getById({ params: { id: 'other' }, user: { id: 'me', role: UserRole.USER } }, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('getById should return 200 for owner', async () => {
    const ctrl = makeController({
      getUserUseCase: { execute: jest.fn().mockResolvedValue({ id: 'u1', email: 'a@b.com' }) },
    });
    const res = mockRes();

    await ctrl.getById({ params: { id: 'u1' }, user: { id: 'u1', role: UserRole.USER } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('list should return 200', async () => {
    const ctrl = makeController({
      listUsersUseCase: { execute: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }) },
    });
    const res = mockRes();

    await ctrl.list({ query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('delete should return 200 with envelope', async () => {
    const ctrl = makeController({
      deleteUserUseCase: { execute: jest.fn().mockResolvedValue(undefined) },
    });
    const res = mockRes();

    await ctrl.delete({ params: { id: 'u1' } }, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'User deleted successfully',
      data: null,
    });
  });

  it('update should return 200', async () => {
    const ctrl = makeController({
      updateUserUseCase: { execute: jest.fn().mockResolvedValue({ id: 'u1', name: 'New' }) },
    });
    const res = mockRes();

    await ctrl.update(
      {
        params: { id: 'u1' },
        user: { id: 'u1', role: UserRole.USER },
        body: { name: 'New' },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('list should return 400 when validation fails', async () => {
    validationResult.mockReturnValue({ isEmpty: () => false, array: () => [{ msg: 'bad' }] });
    const ctrl = makeController();
    const res = mockRes();

    await ctrl.list({ query: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('update should return 400 when validation fails', async () => {
    validationResult.mockReturnValue({ isEmpty: () => false, array: () => [{ msg: 'bad' }] });
    const updateUserUseCase = { execute: jest.fn() };
    const ctrl = makeController({ updateUserUseCase });
    const res = mockRes();

    await ctrl.update(
      {
        params: { id: 'u1' },
        user: { id: 'u1', role: UserRole.USER },
        body: { name: 'New' },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(updateUserUseCase.execute).not.toHaveBeenCalled();
  });

  it('update should return 403 for wrong user', async () => {
    validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
    const updateUserUseCase = { execute: jest.fn() };
    const ctrl = makeController({
      updateUserUseCase,
    });
    const res = mockRes();

    await ctrl.update(
      {
        params: { id: 'other' },
        user: { id: 'me', role: UserRole.USER },
        body: { name: 'New' },
      },
      res
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(updateUserUseCase.execute).not.toHaveBeenCalled();
  });
});
