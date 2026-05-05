'use strict';

const { UpdateUserUseCase } = require('../../../src/domain/use-cases/UpdateUserUseCase');
const { User } = require('../../../src/domain/entities/User');

describe('UpdateUserUseCase', () => {
  it('should update name and persist', async () => {
    const user = new User({
      email: 'a@b.com',
      name: 'Old',
      passwordHash: 'h',
    });
    const repo = {
      findById: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockImplementation(async (u) => u),
    };
    const hasher = { hash: jest.fn() };
    const uc = new UpdateUserUseCase(repo, hasher);

    const out = await uc.execute(user.id, { name: 'New Name' });

    expect(out.name).toBe('New Name');
    expect(repo.update).toHaveBeenCalled();
    expect(hasher.hash).not.toHaveBeenCalled();
  });

  it('should hash new password when provided', async () => {
    const user = new User({
      email: 'a@b.com',
      name: 'Old',
      passwordHash: 'oldhash',
    });
    const repo = {
      findById: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockImplementation(async (u) => u),
    };
    const hasher = { hash: jest.fn().mockResolvedValue('newhash') };
    const uc = new UpdateUserUseCase(repo, hasher);

    await uc.execute(user.id, { password: 'newpass12' });

    expect(hasher.hash).toHaveBeenCalledWith('newpass12');
  });

  it('should throw USER_NOT_FOUND', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null), update: jest.fn() };
    const uc = new UpdateUserUseCase(repo, {});

    await expect(uc.execute('missing', { name: 'Ne' })).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });
});
