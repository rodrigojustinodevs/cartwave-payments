import { jest } from '@jest/globals';
import { LoginUseCase } from '../../../src/domain/use-cases/LoginUseCase.js';
import { User, UserRole } from '../../../src/domain/entities/User.js';

describe('LoginUseCase', () => {
  let repo;
  let hasher;
  let tokenService;
  let uc;

  beforeEach(() => {
    repo = { findByEmail: jest.fn() };
    hasher = { compare: jest.fn() };
    tokenService = { sign: jest.fn().mockReturnValue('jwt-token') };
    uc = new LoginUseCase(repo, hasher, tokenService);
  });

  it('should return token on valid credentials', async () => {
    const user = new User({
      email: 'a@b.com',
      name: 'Test',
      passwordHash: 'stored',
      role: UserRole.USER,
    });
    repo.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(true);

    const result = await uc.execute({ email: 'a@b.com', password: 'ok' });

    expect(tokenService.sign).toHaveBeenCalledWith({ sub: user.id, role: UserRole.USER });
    expect(result.token).toBe('jwt-token');
    expect(result.user.id).toBe(user.id);
  });

  it('should throw INVALID_CREDENTIALS when user missing', async () => {
    repo.findByEmail.mockResolvedValue(null);

    await expect(uc.execute({ email: 'a@b.com', password: 'x' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });

  it('should throw INVALID_CREDENTIALS when password wrong', async () => {
    const user = new User({
      email: 'a@b.com',
      name: 'Test',
      passwordHash: 'stored',
    });
    repo.findByEmail.mockResolvedValue(user);
    hasher.compare.mockResolvedValue(false);

    await expect(uc.execute({ email: 'a@b.com', password: 'bad' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
  });
});
