import type { UserRepositoryPort } from '../ports/UserRepositoryPort.js';
import type { PasswordHasherPort } from '../ports/PasswordHasherPort.js';
import type { CodedError } from '../../types/errors.js';

export interface UpdateUserInput {
  name?: string;
  password?: string;
}

export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort
  ) {}

  async execute(id: string, updates: UpdateUserInput) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      const err = new Error('User not found') as CodedError;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    if (updates.name !== undefined) {
      user.updateProfile({ name: updates.name });
    }

    if (updates.password !== undefined && updates.password !== '') {
      const hash = await this.passwordHasher.hash(updates.password);
      user.changePasswordHash(hash);
    }

    const saved = await this.userRepository.update(user);
    return saved.toJSON();
  }
}
