'use strict';

const { GetUserUseCase } = require('../../../src/domain/use-cases/GetUserUseCase');
const { User } = require('../../../src/domain/entities/User');

describe('GetUserUseCase', () => {
  it('should return user JSON when found', async () => {
    const user = new User({
      email: 'a@b.com',
      name: 'Te',
      passwordHash: 'h',
    });
    const repo = { findById: jest.fn().mockResolvedValue(user) };
    const uc = new GetUserUseCase(repo);

    const out = await uc.execute(user.id);

    expect(out.id).toBe(user.id);
    expect(out.email).toBe('a@b.com');
  });

  it('should throw USER_NOT_FOUND', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) };
    const uc = new GetUserUseCase(repo);

    await expect(uc.execute('missing')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });
});
