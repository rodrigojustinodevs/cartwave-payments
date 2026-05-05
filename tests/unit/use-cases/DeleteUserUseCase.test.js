'use strict';

const { DeleteUserUseCase } = require('../../../src/domain/use-cases/DeleteUserUseCase');
const { User } = require('../../../src/domain/entities/User');

describe('DeleteUserUseCase', () => {
  it('should delete existing user', async () => {
    const user = new User({ email: 'a@b.com', name: 'Te', passwordHash: 'h' });
    const repo = {
      findById: jest.fn().mockResolvedValue(user),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const uc = new DeleteUserUseCase(repo);

    await uc.execute(user.id);

    expect(repo.delete).toHaveBeenCalledWith(user.id);
  });

  it('should throw USER_NOT_FOUND', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null), delete: jest.fn() };
    const uc = new DeleteUserUseCase(repo);

    await expect(uc.execute('x')).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
