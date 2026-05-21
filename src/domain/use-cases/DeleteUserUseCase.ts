import type { UserRepositoryPort } from '../ports/UserRepositoryPort.js';
import type { CodedError } from '../../types/errors.js';

export class DeleteUserUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  async execute(id: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      const err = new Error('User not found') as CodedError;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    await this.userRepository.delete(id);
  }
}
