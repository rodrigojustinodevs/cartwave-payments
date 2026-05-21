import type { UserRepositoryPort } from '../ports/UserRepositoryPort.js';
import type { PasswordHasherPort } from '../ports/PasswordHasherPort.js';
import type { TokenServicePort } from '../ports/TokenServicePort.js';
import type { CodedError } from '../../types/errors.js';

export interface LoginInput {
  email: string;
  password: string;
}

export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly tokenService: TokenServicePort
  ) {}

  async execute({ email, password }: LoginInput) {
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await this.userRepository.findByEmail(normalizedEmail);

    let valid = false;
    if (user) {
      valid = await this.passwordHasher.compare(password, user.passwordHash);
    }

    if (!valid || !user) {
      const err = new Error('Invalid credentials') as CodedError;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const token = this.tokenService.sign({ sub: user.id, role: user.role });

    return {
      token,
      user: user.toJSON(),
    };
  }
}
