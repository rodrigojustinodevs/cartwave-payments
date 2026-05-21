import { jest } from '@jest/globals';
import { CreateUserUseCase } from '../../../src/domain/use-cases/CreateUserUseCase.js';
import { UserRole } from '../../../src/domain/entities/User.js';

describe('CreateUserUseCase', () => {
  let repo;
  let hasher;
  let uc;

  beforeEach(() => {
    repo = {
      findByEmail: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (u) => u),
    };
    hasher = {
      hash: jest.fn().mockResolvedValue('hashed'),
    };
    uc = new CreateUserUseCase(repo, hasher);
  });

  it('should hash password and save user', async () => {
    const out = await uc.execute({ email: 'A@B.COM', name: 'Jane Doe', password: 'secret12' });

    expect(hasher.hash).toHaveBeenCalledWith('secret12');
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(out.email).toBe('a@b.com');
    expect(out.role).toBe(UserRole.USER);
  });

  it('should reject duplicate email', async () => {
    repo.findByEmail.mockResolvedValue({ id: 'x' });

    await expect(uc.execute({ email: 'a@b.com', name: 'Jane Doe', password: 'secret12' })).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_REGISTERED',
    });
  });
});
